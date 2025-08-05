import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME } from './config';
import { ProjectInfo, GroupedResult } from './types';
import { safeGetMetadata, removeEmptyFields } from './dataExtraction';
import { normalizeProjectMetadata, normalizeProjectsMetadata } from './dataNormalization';
import OpenAI from 'openai';

function getValidPrefixes(selectedLibraries: string[] | undefined) {
  const libraryToPrefixMap: {[key: string]: string} = {
    'Energías Renovables': 'ER_',
    'BN Americas': 'BN_',
    'H2 News': 'h2news_',
    'Mining': 'M_',
    'Mining Digital': 'MD_',
    'Minería Chilena': 'MC_',
    'NME': 'nuevamineria_',
    'Periódico de la energía': 'elperiodicodelaenergia_',
    'Portal Minero': 'PM_',
    'Reporte minero y energético': 'reporteminero_',
    'SEA': 'sea_',
  };
  return new Set(
    (selectedLibraries || [])
      .map(lib => libraryToPrefixMap[lib])
      .filter(Boolean)
  );
}

function shouldIncludeMatch(match, prefixSet: Set<string>, threshold: number) {
  if (!match || !match.id || !match.metadata) return false;
  if (prefixSet.size > 0 && ![...prefixSet].some(prefix => match.id.startsWith(prefix))) return false;
  if (match.score === undefined || match.score <= threshold) return false;
  return true;
}

function updateMetadataStats(md, stats) {
  if (!md.title) stats.missingTitle++;
  if (!md.date) stats.missingDate++;
  if (!md.url) stats.missingUrl++;
  if (!md.text) stats.missingText++;
}

function extractProjectInfo(match) {
  const md = match.metadata;
  return {
    id: match.id,
    text: md.text,
    title: md.title,
    projectDate: md.projectDate || md.date || '',
    url: md.url,
    score: match.score,
    tipo: md.tipo || "noticia",
    currentStage: md.currentStage || md.estadoActual || ''
  };
}

function groupMatchesByBaseId(matches) {
  const groups = {};
  for (const match of matches) {
    const baseId = match.id.split('_chunk')[0];
    if (!groups[baseId]) groups[baseId] = [];
    groups[baseId].push(match);
  }
  return groups;
}

export async function performVectorSearch(
  openai: OpenAI,
  query: string, 
  queryAnalysis: any,
  currentScoreThreshold: number,
  selectedLibraries?: string[],
  debugMode = false
): Promise<ProjectInfo[]> {
  const structuredProjects: ProjectInfo[] = [];
  const debugInfo = {
    totalResults: 0,
    filtered: 0,
    grouped: 0,
    finalResults: 0,
    metadataStats: {
      missingTitle: 0,
      missingDate: 0,
      missingUrl: 0,
      missingText: 0
    }
  };

  // 1. Embedding y Pinecone
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
    dimensions: 1024
  });
  const queryEmbedding = await embeddings.embedQuery(query);
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.Index(PINECONE_INDEX_NAME);

  // Ajustar el umbral basado en la longitud y complejidad de la consulta
  const queryLength = query.split(' ').length;
  const isLongQuery = queryLength > 10;
  
  // Ajustar el umbral para consultas largas
  const adjustedThreshold = isLongQuery ? 
    Math.max(currentScoreThreshold - 0.15, 0.35) : // Más permisivo para consultas largas
    Math.max(currentScoreThreshold - 0.1, 0.4);    // Más estricto para consultas cortas

  // Ajustar topK basado en la longitud de la consulta
  const baseTopK = isLongQuery ? 1200 : 800;
  const topK = Math.min(baseTopK + (queryAnalysis.isLibraryQuery ? 300 : 0), 1500);

  // 2. Query Pinecone con ajuste dinámico de topK
  const pineconeQuery: any = { vector: queryEmbedding, topK, includeMetadata: true };
  const results = await index.query(pineconeQuery);
  debugInfo.totalResults = results?.matches?.length || 0;

  // 3. Filtrado y agrupado en un solo recorrido con umbral dinámico
  const prefixSet = getValidPrefixes(selectedLibraries);
  
  const filteredMatches: any[] = [];
  for (const match of results.matches || []) {
    // Forzar que sea proyecto del SEA si la consulta es sobre estados o SEA
    const isSEAProject = match.metadata && (match.metadata.tipo === 'proyecto') && (match.metadata.currentStage || match.metadata.estadoActual);
    const isRelevantMatch = shouldIncludeMatch(match, prefixSet, adjustedThreshold);
    const isStageQueryMatch = queryAnalysis.isStageQuery || queryAnalysis.isSEAQuery ? isSEAProject : true;
    
    if (isRelevantMatch && isStageQueryMatch) {
      updateMetadataStats(match.metadata, debugInfo.metadataStats);
      filteredMatches.push(match);
    }
  }
  debugInfo.filtered = filteredMatches.length;

  // 4. Agrupar por baseId con manejo mejorado de chunks
  const grouped = groupMatchesByBaseId(filteredMatches);
  debugInfo.grouped = Object.keys(grouped).length;

  // 5. Reconstruir documentos y extraer metadata con límite dinámico
  const docLimit = Math.max(
    isLongQuery ? 100 : 80, // Más resultados para consultas largas
    queryAnalysis.specificityLevel > 0.8 || queryAnalysis.isLibraryQuery ? 80 : 80,
    12 // Asegurar mínimo 12 resultados
  );
  
  console.log(`[VECTOR SEARCH] Límite de documentos establecido: ${docLimit}`);
  let processedCount = 0;
  let validResultsCount = 0;

  for (const baseId of Object.keys(grouped)) {
    if (structuredProjects.length >= docLimit) {
      console.log(`[VECTOR SEARCH] Alcanzado límite de ${docLimit} documentos`);
      break;
    }
    processedCount++;
    const group = grouped[baseId];
    group.sort((a, b) => (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0));
    
    // Concatenar textos con manejo mejorado de duplicados
    let fullText = group
      .map(m => m.metadata.text || '')
      .filter(text => text.trim().length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Normalizar saltos de línea
      .trim();
    
    if (fullText) {
      // Usa el primer match para metadata principal con validación mejorada
      const main = group[0];
      const info = extractProjectInfo(main);
      
      // Validar y limpiar la información antes de agregarla
      if (info.text || info.title || info.url) {
        validResultsCount++;
        structuredProjects.push({
          ...info,
          text: fullText
        });
      }
    }
  }

  console.log(`[VECTOR SEARCH] Estadísticas de procesamiento:
  - Total de grupos procesados: ${processedCount}
  - Resultados válidos encontrados: ${validResultsCount}
  - Resultados finales: ${structuredProjects.length}
  - Límite establecido: ${docLimit}`);

  // Sort projects by date (most recent first) con manejo mejorado de fechas inválidas
  structuredProjects.sort((a, b) => {
    const dateA = parseDate(a.projectDate);
    const dateB = parseDate(b.projectDate);
    return dateB.getTime() - dateA.getTime();
  });

  debugInfo.finalResults = structuredProjects.length;

  if (debugMode) {
    console.log('DEBUG:', debugInfo);
  }

  return structuredProjects;
}

// Mejorar la función de parseo de fechas para manejar más formatos y casos edge
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  
  // Limpiar la cadena de fecha
  dateStr = dateStr.trim().replace(/[^\d\/\-\.]/g, '');
  
  // Try different date formats
  const formats = [
    // ISO format (2024-03-14)
    /^\d{4}-\d{2}-\d{2}$/,
    // DD/MM/YYYY
    /^\d{2}\/\d{2}\/\d{4}$/,
    // MM/DD/YYYY
    /^\d{2}\/\d{2}\/\d{4}$/,
    // DD-MM-YYYY
    /^\d{2}-\d{2}-\d{4}$/,
    // MM-DD-YYYY
    /^\d{2}-\d{2}-\d{4}$/,
    // DD.MM.YYYY
    /^\d{2}\.\d{2}\.\d{4}$/,
    // MM.DD.YYYY
    /^\d{2}\.\d{2}\.\d{4}$/,
    // YYYY/MM/DD
    /^\d{4}\/\d{2}\/\d{2}$/,
    // YYYY.MM.DD
    /^\d{4}\.\d{2}\.\d{2}$/,
    // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}$/
  ];

  // Try parsing with different formats
  for (const format of formats) {
    if (format.test(dateStr)) {
      const parts = dateStr.split(/[-\/\.]/);
      if (parts.length === 3) {
        // Handle different date formats
        if (format.toString().includes('YYYY')) {
          // Format starts with year
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const day = parseInt(parts[2]);
          if (isValidDate(year, month, day)) {
            return new Date(year, month, day);
          }
        } else {
          // Format starts with day or month
          const isMonthFirst = format.toString().includes('MM/DD') || 
                             format.toString().includes('MM-DD') || 
                             format.toString().includes('MM.DD');
          if (isMonthFirst) {
            const year = parseInt(parts[2]);
            const month = parseInt(parts[0]) - 1;
            const day = parseInt(parts[1]);
            if (isValidDate(year, month, day)) {
              return new Date(year, month, day);
            }
          } else {
            const year = parseInt(parts[2]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[0]);
            if (isValidDate(year, month, day)) {
              return new Date(year, month, day);
            }
          }
        }
      }
    }
  }

  // If no format matches, try direct Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // If all parsing fails, return epoch
  return new Date(0);
}

// Función auxiliar para validar fechas
function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day);
  return date.getFullYear() === year &&
         date.getMonth() === month &&
         date.getDate() === day;
}