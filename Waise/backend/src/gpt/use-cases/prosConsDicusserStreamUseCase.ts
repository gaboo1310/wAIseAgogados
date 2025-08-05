// prosConsDicusserStreamUseCase.ts
import OpenAI from 'openai';
import { 
  Options, 
  ProjectInfo, 
  ProjectDataWithExtraction 
} from './types';
import { 
  extractConversationId, 
  saveConversationCache, 
  getConversationCache 
} from './conversationCache';
import { 
  isConversationalQuery, 
  handleConversationalQuery, 
  synthesizeQueryFromHistory, 
  handleOpenEndedQuery 
} from './conversationalHandling';
import { 
  analyzeQueryParams, 
  calculateQuerySpecificity, 
  refineQuery 
} from './queryAnalysis';
import { 
  classifyAndFormatContent, 
  extractSpecificData 
} from './dataExtraction';
import { performVectorSearch } from './vectorSearch';
import { generateResponseWithResults } from './responseGeneration';
import { generateInternetContext } from './internetGenerator.use-case';

// // Función principal exportada
// export const prosConsDicusserStreamUseCase = async (openai: OpenAI, options: Options) => {
//   // Extraer selectedLibraries y quitarlo del resto de las opciones
//   const { selectedLibraries, ...restOptions } = options;
//   const { prompt, minScoreThreshold = 0.75, useWebSearch = false, messageHistory = [] } = restOptions;
//   console.log(`Recibida consulta: "${prompt}"`);
//   console.log(`Historial de mensajes recibido: ${messageHistory.length} mensajes`);
  
//   // Detectar si es una consulta conversacional sin contenido técnico
//   if (isConversationalQuery(prompt, messageHistory)) {
//     console.log("Detectada consulta conversacional general. Procesando sin búsqueda vectorial.");
//     return await handleConversationalQuery(openai, prompt, messageHistory);
//   }
  
//   // Extraer el conversationId del historial de mensajes
//   const conversationId = extractConversationId(messageHistory);

//   console.log(`ConversationID extraído: ${messageHistory || 'No disponible'}`);
  
//   // Variables iniciales
//   let structuredProjects: ProjectInfo[] = [];
//   let parsedContent: any = { proyectos: [], noticias: [] };
//   let specificData: any[] = [];
//   let proyectosReconstruidos: any[] = [];
//   let skipSearch = false; // Bandera para controlar el flujo
//   let searchPrompt = prompt; // Usar esta variable para manipulación
//   let isOpenEnded = false;
//   let mainTopic = '';
  
//   // Analizar si la consulta es abierta
//   try {
//     const openEndedAnalysis = await handleOpenEndedQuery(openai, searchPrompt, messageHistory);
//     searchPrompt = openEndedAnalysis.enhancedQuery;
//     isOpenEnded = openEndedAnalysis.isOpenEnded;
//     mainTopic = openEndedAnalysis.mainTopic;
    
//     if (isOpenEnded) {
//       console.log(`[CONSULTA ABIERTA] Reformulada como: "${searchPrompt}"`);
//     }
//   } catch (error) {
//     console.error("[ERROR] Error al analizar consulta abierta:", error);
//     // En caso de error, mantener la consulta original
//     searchPrompt = prompt;
//   }


// En la función prosConsDicusserStreamUseCase
export const prosConsDicusserStreamUseCase = async (openai: OpenAI, options: Options) => {
  const { selectedLibraries, focus, ...restOptions } = options;
  const { prompt, minScoreThreshold = 0.75, useWebSearch = false, messageHistory = [] } = restOptions;
  console.log(`Recibida consulta: "${prompt}"`);
  console.log(`Historial de mensajes recibido: ${messageHistory.length} mensajes`);
  
  // Analizar la consulta para determinar características específicas
  const promptLower = prompt.toLowerCase();
  
  // Detectar comandos explícitos de búsqueda o resumen
  const hasSearchCommand = /\b(busca|buscar|encuentra|encontrar|dame información sobre)\b/i.test(prompt);
  const hasSummaryCommand = /\b(haz|hacer|genera|generar|crea|crear|elabora|elaborar)\s+(un|una|el|la)?\s+(resumen|análisis|extracto|informe)\b/i.test(prompt);
  const hasMentionOfProject = /\bproyecto\s+[a-záéíóúñ\s]{3,}\b/i.test(prompt);
  
  let systemPromptPrefix = '';
  if (focus && focus.trim()) {
    systemPromptPrefix = `ENFOQUE DEL USUARIO: ${focus}\n\n`;
  }
  
  // Detectar si es una consulta conversacional sin contenido técnico
  if (!hasSearchCommand && !hasSummaryCommand && !hasMentionOfProject && isConversationalQuery(prompt, messageHistory)) {
    console.log("Detectada consulta conversacional general. Procesando sin búsqueda vectorial.");
    return await handleConversationalQuery(openai, prompt, messageHistory, { systemPromptPrefix });
  }
  
  // Si la consulta contiene comandos explícitos o menciones a proyectos específicos
  if (hasSearchCommand || hasSummaryCommand || hasMentionOfProject) {
    console.log("Detectado comando de búsqueda, resumen o mención de proyecto específico. Forzando búsqueda vectorial.");
    // Continuará con el flujo normal de búsqueda vectorial
  }
  
  // Extraer el conversationId del historial de mensajes
  const conversationId = extractConversationId(messageHistory);

  console.log(`ConversationID extraído: ${conversationId || 'No disponible'}`);
  
  // Variables iniciales
  let structuredProjects: ProjectInfo[] = [];
  let parsedContent: any = { proyectos: [], noticias: [] };
  let specificData: any[] = [];
  let proyectosReconstruidos: any[] = [];
  let skipSearch = false; // Bandera para controlar el flujo
  let searchPrompt = prompt; // Usar esta variable para manipulación
  let isOpenEnded = false;
  let mainTopic = '';
  
  // Analizar si la consulta es abierta
  try {
    const openEndedAnalysis = await handleOpenEndedQuery(openai, searchPrompt, messageHistory);
    searchPrompt = openEndedAnalysis.enhancedQuery;
    isOpenEnded = openEndedAnalysis.isOpenEnded;
    mainTopic = openEndedAnalysis.mainTopic;
    
    if (isOpenEnded) {
      console.log(`[CONSULTA ABIERTA] Reformulada como: "${searchPrompt}"`);
    }
  } catch (error) {
    console.error("[ERROR] Error al analizar consulta abierta:", error);
    // En caso de error, mantener la consulta original
    searchPrompt = prompt;
  }
  
  // Si hay un conversationId y suficientes mensajes para considerar que es continuación
  if (conversationId && messageHistory.length >= 3) {
    console.log(`[CONVERSACIÓN] conversationId detectado (${conversationId}), usando historial para nueva búsqueda.`);

    // (Opcional) Puedes sintetizar mejor la consulta basada en los últimos mensajes
    const lastMessages = messageHistory.slice(-6)  // Últimos 3 turnos (6 mensajes)
      .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n');

    // Puedes construir un prompt más enriquecido si quieres
    const enrichedPrompt = `Contexto de la conversación reciente:\n${lastMessages}\n\nNueva consulta:\n${prompt}`;

    // Sobrescribir el prompt que usarás para búsqueda
    searchPrompt = enrichedPrompt;
  }

  // Si useWebSearch está activo y no hay selectedLibraries, omitir la búsqueda vectorial
  if (useWebSearch && (!selectedLibraries || selectedLibraries.length === 0)) {
    console.log(`[OPTIMIZACIÓN] Omitiendo búsqueda vectorial para consulta con búsqueda web activada y sin bibliotecas seleccionadas`);
    skipSearch = true;
  } else if (!skipSearch) {
    // Realizar búsqueda vectorial solo si no se debe omitir
    const queryAnalysis = analyzeQueryParams(searchPrompt);
    console.log('Query analysis:', queryAnalysis);
    
    // Usar umbral adaptativo basado en la especificidad de la consulta
    let currentScoreThreshold = queryAnalysis.adaptiveThreshold;
    let currentQuery = searchPrompt;
    
    // Establecer un umbral mínimo basado en la especificidad
    const MIN_SCORE_THRESHOLD = queryAnalysis.specificityLevel > 0.8 ? 0.4 : 0.5;
    
    // Ajustar el número máximo de refinamientos según la especificidad
    const MAX_REFINEMENT_ATTEMPTS = queryAnalysis.specificityLevel > 0.8 ? 5 : 4;
    
    console.log(`Using adaptive threshold: ${currentScoreThreshold} (min: ${MIN_SCORE_THRESHOLD})`);
    console.log(`Max refinement attempts: ${MAX_REFINEMENT_ATTEMPTS}`);

    // Outer loop to ensure we find as many projects as possible while lowering the threshold to MIN_SCORE_THRESHOLD
    while (structuredProjects.length < 15 && currentScoreThreshold >= MIN_SCORE_THRESHOLD) {
      let attemptNumber = 0;

      // Inner loop to try multiple query refinements at current threshold
      while (structuredProjects.length < 15 && attemptNumber < MAX_REFINEMENT_ATTEMPTS) {
        try {
          // Refine query (only on subsequent attempts)
          if (attemptNumber > 0) {
            currentQuery = await refineQuery(openai, searchPrompt + '(año actual: 2025)', attemptNumber, queryAnalysis);
          }
          
          console.log(`\n===== ATTEMPT ${attemptNumber + 1} (Threshold: ${currentScoreThreshold}) =====`);
          console.log("Current query:", currentQuery);

          // Realizar búsqueda vectorial
          const newProjects = await performVectorSearch(openai, currentQuery, queryAnalysis, currentScoreThreshold, selectedLibraries);
          
          // Añadir los nuevos proyectos a los existentes
          structuredProjects = [...structuredProjects, ...newProjects];
          
          // Move to next refinement attempt
          attemptNumber++;

        } catch (error) {
          console.error(`Error in attempt ${attemptNumber + 1}:`, error);
          break;
        }
      }

      if (structuredProjects.length < 10) {
        const newThreshold = Math.max(currentScoreThreshold - 0.05, MIN_SCORE_THRESHOLD);

        // If we've reached the minimum threshold and can't lower it further, break out
        if (newThreshold === currentScoreThreshold) {
          break;
        }

        currentScoreThreshold = newThreshold;
        console.log(`Not enough projects. Lowering threshold to: ${currentScoreThreshold}`);
      } else {
        // We found enough projects, no need to lower threshold further
        break;
      }
    }

    // Log the final results
    console.log("############################################");
    console.log(`Found ${structuredProjects.length} projects with lowest threshold ${currentScoreThreshold}`);
    console.log("############################################");

    const formattedContent = classifyAndFormatContent(structuredProjects);

    try {
      // Si el resultado es un string plano, intenta parsear solo si parece JSON
      if (typeof formattedContent === 'string' && formattedContent.trim().startsWith('{')) {
        parsedContent = JSON.parse(formattedContent as string);
      } else {
        // Si no es JSON, setea un objeto por defecto
        parsedContent = {
          proyectos: [],
          noticias: [],
          mensaje: 'No se encontraron resultados relevantes para la fuente seleccionada.'
        };
      }
    } catch (e) {
      parsedContent = {
        proyectos: [],
        noticias: [],
        mensaje: 'No se encontraron resultados relevantes para la fuente seleccionada.'
      };
    }

    const { proyectos = [], noticias = [] } = parsedContent;

    specificData = extractSpecificData(structuredProjects, searchPrompt);

    proyectosReconstruidos = structuredProjects.map(project => ({
      textoCompleto: project.text,
      titulo: project.title,
      fecha: project.projectDate,
      url: project.url,
      puntuacion: project.score
    }));
    
    // Guardar resultados en caché si tenemos un ID de conversación
    if (conversationId) {
      saveConversationCache(
        conversationId,
        searchPrompt, // Guardar la consulta sintetizada como original
        structuredProjects,
        proyectos,
        noticias,
        specificData,
        proyectosReconstruidos
      );
    }
  }

  // Generar respuesta final
  return await generateResponseWithResults(
    openai,
    prompt,
    messageHistory,
    structuredProjects,
    parsedContent.proyectos || [],
    parsedContent.noticias || [],
    specificData,
    proyectosReconstruidos,
    useWebSearch,
    isOpenEnded,
    mainTopic,
    systemPromptPrefix
  );
};