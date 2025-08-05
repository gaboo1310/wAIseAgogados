// dataExtraction.ts
import { ProjectInfo, ProjectDataWithExtraction } from './types';

// Safe metadata extraction function
export function safeGetMetadata(metadata: any, key: string, defaultValue: string = ''): string {
  return metadata && metadata[key] ? String(metadata[key]) : defaultValue;
}



// Utilidad para limpiar campos vacíos, nulos o "No especificado"
export function removeEmptyFields(obj: Record<string, any>) {
  const invalids = [null, undefined, '', 'No especificado', 'No date', 'unknown', 'No URL', 'Untitled'];
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => !invalids.includes(v))
  );
}

// Clasificación y formateo de contenido
export function classifyAndFormatContent(projects: ProjectInfo[]) {
  if (!projects || projects.length === 0) {
    return "No se encontró contenido relevante.";
  }
  
  // Clasificar cada resultado como proyecto o noticia
  const classifiedContent = projects.map(item => {
    const text = item.text || '';
    const lowerText = text.toLowerCase();
    const title = item.title || '';
    const lowerTitle = title.toLowerCase();
    
    // Criterios para identificar un proyecto real
    const projectIndicators = [
      // Términos específicos de proyectos
      lowerText.includes("proyecto minero") && lowerText.includes("desarrollo"),
      lowerText.includes("construcción de") && (lowerText.includes("planta") || lowerText.includes("mina")),
      lowerText.includes("instalación") && lowerText.includes("capacidad de"),
      lowerText.includes("inversión de") && lowerText.includes("millones") && lowerText.includes("proyecto"),
      // Campos típicos de proyecto mencionados juntos
      (lowerText.includes("mw") || lowerText.includes("megawatt")) && lowerText.includes("construcción") && lowerText.includes("desarrollador"),
      lowerText.includes("toneladas") && lowerText.includes("producción") && lowerText.includes("construcción")
    ];
    
    // Verificar título para indicadores de proyecto
    const titleIndicators = [
      lowerTitle.includes("proyecto"),
      lowerTitle.includes("planta"),
      lowerTitle.includes("mina"),
      lowerTitle.includes("construcción de")
    ];
    
    // Determinar si es más probable que sea un proyecto o una noticia
    const isLikelyProject = projectIndicators.some(indicator => indicator) || 
                            titleIndicators.filter(indicator => indicator).length >= 2;
    
    // Extraer información básica común
    const basicInfo = {
      titulo: item.title,
      fecha: item.projectDate,
      url: item.url,
      score: item.score && item.score.toFixed ? item.score.toFixed(3) : item.score,
      resumen: text.length > 300 ? text.substring(0, 300) + "..." : text
    };
    
    if (isLikelyProject) {
      // Formatear como proyecto y limpiar campos vacíos
      return removeEmptyFields({
        tipo: "proyecto",
        ...basicInfo,
        // Extraer información específica de proyecto
        tipoProyecto: extractProjectType(text),
        ubicacion: extractLocation(text),
        inversionEstimada: extractInvestment(text),
        desarrollador: extractDeveloper(text),
        estadoActual: extractStatus(text),
        capacidadProyectada: extractCapacity(text),
        tramitacionAmbiental: extractEnvironmentalStatus(text)
      });
    } else {
      // Formatear como noticia/artículo y limpiar campos vacíos
      return removeEmptyFields({
        tipo: "noticia",
        ...basicInfo,
        temasPrincipales: extractMainTopics(text),
        fuenteInformacion: extractSource(item)
      });
    }
  });
  
  // Separar proyectos y noticias
  const proyectos = classifiedContent.filter(item => item.tipo === "proyecto");
  const noticias = classifiedContent.filter(item => item.tipo === "noticia");
  
  // Construir respuesta estructurada
  const response = {
    proyectos: proyectos,
    noticias: noticias,
    estadisticas: {
      totalResultados: classifiedContent.length,
      proyectosIdentificados: proyectos.length,
      noticiasIdentificadas: noticias.length
    }
  };
  
  return JSON.stringify(response, null, 2);
}

// Funciones específicas de extracción de datos

export function extractProjectType(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("minería") || lowerText.includes("mina")) {
    if (lowerText.includes("oro")) return "Minería de oro";
    if (lowerText.includes("plata")) return "Minería de plata";
    if (lowerText.includes("cobre")) return "Minería de cobre";
    if (lowerText.includes("litio")) return "Minería de litio";
    return "Proyecto minero";
  } else if (lowerText.includes("energía")) {
    if (lowerText.includes("solar")) return "Energía solar";
    if (lowerText.includes("eólica")) return "Energía eólica";
    if (lowerText.includes("hidroeléctrica")) return "Energía hidroeléctrica";
    return "Proyecto energético";
  }
  
  return null;
}

export function extractLocation(text: string): string | null {
  const regionMatches = text.match(/región de ([a-zá-úñ]+)/i);
  if (regionMatches) {
    return `Región de ${regionMatches[1]}, Chile`;
  } else if (text.toLowerCase().includes("chile")) {
    return "Chile";
  }
  return null;
}

export function extractInvestment(text: string): string | null {
  const investmentMatches = text.match(/USD\s+(\d+(\.\d+)?)\s+millones/i) || 
                           text.match(/US\$\s*(\d+(\.\d+)?)\s+millones/i);
  if (investmentMatches) {
    return `USD ${investmentMatches[1]} millones`;
  }
  return null;
}

export function extractDeveloper(text: string): string | null {
  // Lista de desarrolladores comunes para buscar
  const commonDevelopers = [
    "Codelco", "BHP", "Anglo American", "Antofagasta Minerals", 
    "Colbún", "Enel", "Engie", "AES Gener"
  ];
  
  for (const developer of commonDevelopers) {
    if (text.includes(developer)) {
      return developer;
    }
  }
  
  // Buscar patrones como "desarrollado por [Empresa]"
  const developerMatch = text.match(/desarrollado por ([A-Za-z\s]+)/i) ||
                        text.match(/propiedad de ([A-Za-z\s]+)/i);
  if (developerMatch) {
    return developerMatch[1].trim();
  }
  
  return null;
}

export function extractStatus(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("en operación") || lowerText.includes("operando")) {
    return "En operación";
  } else if (lowerText.includes("en construcción")) {
    return "En construcción";
  } else if (lowerText.includes("planificación") || lowerText.includes("proyectado")) {
    return "En planificación";
  } else if (lowerText.includes("estudio")) {
    return "En estudio";
  }
  
  return null;
}

export function extractCapacity(text: string): string | null {
  const capacityMatches = text.match(/(\d+)\s*MW/i) ||
                         text.match(/(\d+)\s*megawatt/i) ||
                         text.match(/capacidad\s+de\s+(\d+)/i);
  if (capacityMatches) {
    return `${capacityMatches[1]} MW`;
  }
  
  return null;
}

export function extractEnvironmentalStatus(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("aprobado") && (lowerText.includes("ambiental") || lowerText.includes("eia"))) {
    return "Aprobado";
  } else if (lowerText.includes("en evaluación") && (lowerText.includes("ambiental") || lowerText.includes("eia"))) {
    return "En evaluación";
  } else if (lowerText.includes("eia") || lowerText.includes("evaluación de impacto ambiental")) {
    return "Sometido a EIA";
  }
  
  return null;
}

export function extractMainTopics(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Declarar explícitamente el tipo de array como string[]
  const topics: string[] = [];
  
  // Verificar temas comunes en el sector
  if (lowerText.includes("sostenib") || lowerText.includes("sustentab")) topics.push("Sostenibilidad");
  if (lowerText.includes("inversión") || lowerText.includes("financiamiento")) topics.push("Inversión");
  if (lowerText.includes("tecnología") || lowerText.includes("innovación")) topics.push("Tecnología");
  if (lowerText.includes("regulación") || lowerText.includes("legislación")) topics.push("Regulación");
  if (lowerText.includes("comunidad") || lowerText.includes("social")) topics.push("Comunidades");
  if (lowerText.includes("producción") || lowerText.includes("productividad")) topics.push("Producción");
  
  return topics.length > 0 ? topics.join(", ") : "General";
}

export function extractSource(item: ProjectInfo): string | null {
  // Extraer fuente basado en URL
  if (item.url) {
    const urlMatch = item.url.match(/https?:\/\/(www\.)?([^\/]+)/i);
    if (urlMatch && urlMatch[2]) {
      return urlMatch[2];
    }
  }
  
  return null;
}

// Nueva función para extraer datos específicos (números, fechas, cantidades, etc.)
export function extractSpecificData(projects: ProjectInfo[], prompt: string): ProjectDataWithExtraction[] {
  // Analizar la consulta para determinar qué tipo de datos específicos buscar
  const lowerPrompt = prompt.toLowerCase();
  
  // Definir patrones de búsqueda basados en la consulta
  const patterns: Record<string, RegExp[]> = {
    // Patrones para cantidades numéricas
    quantities: [
      /(\d+)\s*(unidades|equipos|aerogeneradores|paneles|palas|camiones|proyectos)/gi,
      /capacidad\s*(?:de|instalada)?\s*(\d+(?:\.\d+)?)\s*(mw|gwh|kw)/gi,
      /producción\s*(?:de)?\s*(\d+(?:\.\d+)?)\s*(toneladas|ton)/gi,
      /inversión\s*(?:de)?\s*(?:usd|us\$)?\s*(\d+(?:\.\d+)?)\s*(?:millones|mill)/gi
    ],
    
    // Patrones para fechas
    dates: [
      /(?:en|durante|para|el año)\s*(20\d\d)/gi,
      /(?:primer|segundo|tercer|cuarto)\s*trimestre\s*(?:de|del)?\s*(20\d\d)/gi,
      /(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*(?:de|del)?\s*(20\d\d)/gi
    ],
    
    // Patrones para lugares específicos
    locations: [
      /\b(?:en|de)\s+(chile|perú|peru|argentina|colombia|brasil)\b/gi,
      /región\s+de\s+([a-zá-úñ\s]+)(?:,|\.|$)/gi,
      /provincia\s+de\s+([a-zá-úñ\s]+)(?:,|\.|$)/gi
    ],
    
    // Patrones para empresas o entidades
    entities: [
      /\b((?:[A-Z][a-z]*\s*){1,4}(?:S\.A\.|Ltda\.|Inc\.|Corp\.)?)\b(?:\s+(?:desarrollará|construirá|invertirá|instalará))/g
    ]
  };
  
  // Determinar qué patrones usar basados en la consulta
  const patternsToUse: RegExp[] = [];
  
  if (/cuántos|cuantos|cantidad|número|total/i.test(lowerPrompt)) {
    patternsToUse.push(...patterns.quantities);
  }
  
  if (/cuándo|cuando|fecha|año|plazo/i.test(lowerPrompt)) {
    patternsToUse.push(...patterns.dates);
  }
  
  if (/dónde|donde|ubicación|ubicado|región/i.test(lowerPrompt)) {
    patternsToUse.push(...patterns.locations);
  }
  
  if (/quién|quien|empresa|desarrollador|compañía/i.test(lowerPrompt)) {
    patternsToUse.push(...patterns.entities);
  }
  
  // Si no se identificaron patrones específicos, usar todos
  if (patternsToUse.length === 0) {
    patternsToUse.push(
      ...patterns.quantities,
      ...patterns.dates,
      ...patterns.locations,
      ...patterns.entities
    );
  }
  
  // Extraer datos específicos de los documentos
  const specificData: ProjectDataWithExtraction[] = [];
  
  for (const project of projects) {
    const projectData: ProjectDataWithExtraction = {
      title: project.title,
      url: project.url,
      date: project.projectDate,
      score: project.score,
      extractedData: []
    };
    
    const text = project.text || '';
    
    // Buscar coincidencias para cada patrón
    for (const pattern of patternsToUse) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match) {
          // Extraer contexto alrededor de la coincidencia
          const matchIndex = text.indexOf(match[0]);
          const start = Math.max(0, matchIndex - 100);
          const end = Math.min(text.length, matchIndex + match[0].length + 100);
          const context = text.substring(start, end);
          
          projectData.extractedData.push({
            rawMatch: match[0],
            captureGroups: match.slice(1).filter(Boolean),
            context: context
          });
        }
      }
    }
    
    // Solo agregar documentos que tengan datos extraídos
    if (projectData.extractedData.length > 0) {
      specificData.push(projectData);
    }
  }
  
  return specificData;
}