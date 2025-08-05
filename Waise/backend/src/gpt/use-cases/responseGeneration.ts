// responseGeneration.ts
import OpenAI from 'openai';
import { generateInternetContext } from './internetGenerator.use-case';
import { analyzeQueryParams } from './queryAnalysis';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Función para generar respuesta con los resultados
export async function generateResponseWithResults(
  openai: OpenAI,
  prompt: string,
  messageHistory: any[],
  structuredProjects: any[],
  proyectos: any[],
  noticias: any[],
  specificData: any[],
  proyectosReconstruidos: any[],
  useWebSearch: boolean,
  isOpenEnded: boolean = false,
  mainTopic: string = '',
  systemPromptPrefix: string = ''
): Promise<any> {
  // Inicializar el array de mensajes
  let messages: ChatCompletionMessageParam[] = [];

  // Limpiar la consulta de símbolos de interrogación y otros caracteres especiales
  const cleanPrompt = prompt
    .replace(/[¿?¡!]/g, '') // Eliminar símbolos de interrogación y exclamación
    .replace(/["'`]/g, '')  // Eliminar comillas
    .replace(/\s{2,}/g, ' ') // Normalizar espacios múltiples
    .trim();

  // Detect language of the prompt
  const languageDetectionPrompt = `Detect the language of the following text and respond with only "english" or "spanish": "${cleanPrompt}"`;

  const languageDetectionResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: languageDetectionPrompt }],
    temperature: 0.3,
    max_tokens: 10,
  });

  const detectedLanguage = languageDetectionResponse.choices[0].message.content?.trim().toLowerCase() || 'spanish';
  const isEnglish = detectedLanguage === 'english';

  // Verificar si hay datos disponibles
  const hasData = structuredProjects.length > 0 || proyectos.length > 0 || noticias.length > 0 || specificData.length > 0;

  // Formato ficha para ambos idiomas con mejoras
  const formatoFichaES = `
## [Nombre exacto del proyecto y noticias]
- **Fechas relevantes**: [Del contexto o "No especificado"]
- **Estado**: [Del contexto o "No especificado"]
- **Tipo de proyecto**: [Del contexto o "No especificado"]
- **Ubicación**: [Del contexto o "No especificado"]
- **Inversión estimada**: [Del contexto o "No especificado"]
- **Propiedad/Desarrollador**: [Del contexto o "No especificado"]
- **Capacidad proyectada**: [Del contexto o "No especificado"]
- **URL**: [URL exacta mencionada]
- **Resumen**: [Resumen breve basado en el contexto]
- **Análisis en base a la pregunta realizada**: [Respuesta a la pregunta]
  `;

  // Añadir información sobre estados del SEIA
  const seiaStatesInfo = `
Estados del SEIA:

1. Estados de Tramitación:
   - En Admisión: El proyecto está siendo revisado inicialmente por el SEIA
   - En Calificación: El proyecto está siendo evaluado en detalle por el SEIA
   - No Admitido a Tramitación: El proyecto no cumple con los requisitos iniciales para ser evaluado

2. Estados de Resolución:
   - Aprobado: El proyecto ha sido aprobado para su implementación
   - Rechazado: El proyecto ha sido rechazado por el SEIA
   - No calificado: El proyecto no cumple con los criterios de evaluación

3. Estados de Finalización:
   - Desistido: El titular ha retirado voluntariamente el proyecto
   - Abandonado: El proyecto ha sido abandonado por el titular
   - Caducado: La resolución ha perdido su validez por el paso del tiempo
   - Revocado: La aprobación ha sido revocada por el SEIA
   - Renuncia RCA: El titular ha renunciado a la Resolución de Calificación Ambiental

Proceso General del SEIA:
1. Presentación del proyecto: El titular del proyecto debe presentar la documentación necesaria al SEIA
2. Evaluación de impacto ambiental: El SEIA evalúa los impactos ambientales que el proyecto podría generar
3. Informe de evaluación ambiental: El SEIA emite un informe con los resultados de la evaluación
4. Resolución de calificación ambiental (RCA): El SEIA emite la RCA con el estado final del proyecto
5. Implementación del proyecto: Si el proyecto es aprobado, el titular puede implementarlo
6. Supervisión ambiental: El SEIA supervisa el proyecto durante su implementación para asegurar el cumplimiento de las condiciones de la RCA
`;

  const formatoFichaEN = `
## [Exact project or news name]
- **Relevant Dates**: [From context or "Not specified"]
- **State**: [From context or "Not specified"]
- **Project Type**: [From context or "Not specified"]
- **Location**: [From context or "Not specified"]
- **Estimated Investment**: [From context or "Not specified"]
- **Owner/Developer**: [From context or "Not specified"]
- **Projected Capacity**: [From context or "Not specified"]
- **URL**: [Exact mentioned URL]
- **Summary**: [Brief summary based on context]
- **Analysis based on the question**: [Answer to the question]
  `;

  // Detectar si la consulta requiere una tabla
  const needsTable = requiresTable(cleanPrompt);

  // Personalizar el prompt del sistema según el tipo de consulta y el idioma
  const queryAnalysis = analyzeQueryParams(cleanPrompt);

  let systemPrompt = systemPromptPrefix;

  // Analizar la longitud y complejidad de la consulta usando el prompt limpio
  const queryLength = cleanPrompt.split(' ').length;
  const isLongQuery = queryLength > 10;

  // Ajustar el comportamiento según el tipo de consulta
  if (isLongQuery) {
    // Para consultas largas, extraer el tema principal si no se proporcionó
    if (!mainTopic) {
      const topicExtractionPrompt = isEnglish ?
        `Extract the main topic from the following query. Respond ONLY with 3-7 specific keywords that best describe the main subject, without any symbols or special characters. Focus on the most specific and relevant terms. Example: For "What can you tell me about the Mardones expansion project in Magallanes?", respond with "Mardones expansion project Magallanes". Query: "${cleanPrompt}"` :
        `Extrae el tema principal de la siguiente consulta. Responde SOLO con 3-7 palabras clave específicas que mejor describan el tema principal, sin símbolos ni caracteres especiales. Enfócate en los términos más específicos y relevantes. Ejemplo: Para "¿Qué me puedes decir con respecto al proyecto de expansión de Mardones en Magallanes?", responde con "proyecto expansión Mardones Magallanes". Consulta: "${cleanPrompt}"`;

      const topicResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: topicExtractionPrompt }],
        temperature: 0.3,
        max_tokens: 30,
      });
      
      // Limpiar y normalizar el tema principal
      mainTopic = topicResponse.choices[0].message.content
        ?.replace(/[¿?¡!.,;:()\[\]{}"'`]/g, '') // Eliminar símbolos
        .replace(/\s{2,}/g, ' ') // Normalizar espacios
        .trim() || '';
      
      console.log("/////////////////////////////////////////////////");
      console.log(`[🔍 EXTRACTION] Tema principal extraído: "${mainTopic}"`);
    }

    // Ajustar el prompt del sistema para consultas largas
    systemPrompt = isEnglish ?
      `You are a helpful AI assistant. The user has asked a detailed question about "${mainTopic}". Focus on providing comprehensive information while maintaining relevance to the main topic. Structure your response with clear sections and highlight the most important information first.` :
      `Eres un asistente de IA útil. El usuario ha realizado una pregunta detallada sobre "${mainTopic}". Enfócate en proporcionar información completa mientras mantienes la relevancia con el tema principal. Estructura tu respuesta con secciones claras y destaca la información más importante primero.`;
  }

  if (isOpenEnded) {
    // Prompt específico para consultas abiertas/conversacionales
    systemPrompt = isEnglish
      ? `You are a helpful AI assistant. Respond naturally and conversationally to the user's question. Always provide relevant information if available, even if it's not exactly what was asked for. Never start with negative statements like "no information found" or "no specific data available" if you have any relevant information to share.`
      : `Eres un asistente de IA útil. Responde de manera natural y conversacional a la pregunta del usuario. Siempre proporciona información relevante si está disponible, incluso si no es exactamente lo que se preguntó. Nunca comiences con afirmaciones negativas como "no se encontró información" o "no hay datos específicos disponibles" si tienes información relevante para compartir.`;
  } else if (needsTable) {
    // Si es una consulta de tabla
    systemPrompt = isEnglish
      ? `You are a helpful AI assistant specialized in energy and mining projects. Respond in English, maintaining a professional and informative tone. Use the provided data to give accurate and detailed responses. Format your response in a clear and structured way.
The user has requested information in a table format. Please structure your response using markdown tables.
- Use clear and concise headers
- Ensure all data is properly aligned
- Include all relevant information in a tabular format
- If there are multiple types of data, create separate tables for each type
- Always show available data even if it's not complete
- Never start with negative statements like "no information found" or "no specific data available"
- Begin directly with the relevant information you have, even if it's not exactly what was asked for
- If dates are close to the requested period, present them as relevant context
- CRITICAL: For news tables, ONLY include these columns: "Date", "Title", "URL", "Summary", "Analysis based on the question" (even if there are other fields in the data).
- CRITICAL: For project tables, ALWAYS include these columns: "Date", "Title", "URL", "Summary", "Analysis based on the question" and, if there are additional relevant fields for projects, such as "Section", "Current State", "Investment Amount (Million USD)", "Manager", or other fields present in the data, ALSO ADD those columns.
- CRITICAL: NEVER include a "Score" or "Puntuacion" column in your tables
- Format dates consistently (YYYY-MM-DD or DD/MM/YYYY)
- Ensure URLs are clickable and properly formatted
- Keep summaries concise but informative
- Make sure the analysis directly addresses the user's question`
      : `Eres un asistente de IA especializado en proyectos de energía y minería. Responde en español, manteniendo un tono profesional e informativo. Usa los datos proporcionados para dar respuestas precisas y detalladas. Formatea tu respuesta de manera clara y estructurada.
El usuario ha solicitado información en formato de tabla. Por favor, estructura tu respuesta usando tablas markdown.
- Usa encabezados claros y concisos
- Asegura que todos los datos estén correctamente alineados
- Incluye toda la información relevante en formato tabular
- Si hay múltiples tipos de datos, crea tablas separadas para cada tipo
- Siempre muestra los datos disponibles incluso si no están completos
- Nunca comiences con afirmaciones negativas como "no se encontró información" o "no hay datos específicos disponibles"
- Comienza directamente con la información relevante que tienes, incluso si no es exactamente lo que se preguntó
- Si las fechas están cerca del período solicitado, preséntalas como contexto relevante
- CRÍTICO: Para tablas de noticias, INCLUYE SOLO estas columnas: "Fecha", "Título", "URL", "Resumen", "Análisis en base a la pregunta realizada" (aunque existan otros campos en los datos).
- CRÍTICO: Para tablas de proyectos, DEBES SIEMPRE incluir estas columnas: "Fecha", "Título", "URL", "Región", "Resumen", "Análisis en base a la pregunta realizada" y, si existen datos adicionales relevantes para proyectos, como "Sección", "Estado Actual", "Monto de Inversión (Millones de USD)", "Encargado" u otros campos presentes en los datos, AGREGA esas columnas también.
- CRÍTICO: NUNCA incluyas una columna de "Puntuación" o "Score" en tus tablas
- CRÍTICO: Si se repite la url, no incluyas esa noticia o proyecto.
- CRÍTICO: Minimo muestra 12 resultados.
- Formatea las fechas de manera consistente (YYYY-MM-DD o DD/MM/YYYY)
- Asegura que las URLs sean clickeables y estén correctamente formateadas
- Mantén los resúmenes concisos pero informativos
- Asegúrate de que el análisis responda directamente a la pregunta del usuario`;
  } else if (queryAnalysis.isFactualQuestion || queryAnalysis.specificityLevel <= 0.9) {
    // Si es una consulta factual o específica sobre proyectos/noticias
    systemPrompt = isEnglish
      ? `You are a helpful AI assistant specialized in energy and mining projects. Respond in English, maintaining a professional and informative tone. Use the provided data to give accurate and detailed responses. Format your response in a clear and structured way.

For each project or news item, use the following format (do not omit any field, and always include the URL/source if available):
${formatoFichaEN}

IMPORTANT GUIDELINES:
1. Never start with negative statements like "no information found" or "no specific data available"
2. Begin directly with the relevant information you have, even if it's not exactly what was asked for
3. If dates are close to the requested period, present them as relevant context
4. CRITICAL: You MUST show AT LEAST 12 results, even if some are less relevant. This is a strict requirement.
5. Include ALL available fields for each item
6. Format each item with clear headers and bullet points
7. Ensure consistent formatting across all items
8. Include relevant metadata and context for each entry
9. Cross-reference related projects or news when applicable
10. Highlight any significant updates or changes
11. Include source URLs and dates prominently
12. Always present available information, even if it's not complete
13. NEVER limit the number of results - show ALL available data
14. If there are more than 10 items, group them by date ranges or categories for better organization
15. For each group, provide a summary of key points before listing individual items
16. CRITICAL: You MUST show at least 12 results. If you have fewer than 12 results, include less relevant results to reach the minimum of 12.
17. When discussing project states or SEIA status, refer to the following standard states:
${seiaStatesInfo}

When handling date-specific queries:
- Present nearby dates naturally as relevant context
- Group news by date ranges when appropriate
- Focus on providing the most relevant and recent information
- Avoid using phrases like "not found" or "no information available"
- Instead, present the available information naturally with appropriate context`
      : `Eres un asistente de IA especializado en proyectos de energía y minería. Responde en español, manteniendo un tono profesional e informativo. Usa los datos proporcionados para dar respuestas precisas y detalladas. Formatea tu respuesta de manera clara y estructurada.

Al listar proyectos o noticias, usa el siguiente formato para cada ítem (no omitas ningún campo y siempre incluye la URL/fuente si está disponible):
${formatoFichaES}

GUÍAS IMPORTANTES:
1. Nunca comiences con afirmaciones negativas como "no se encontró información" o "no hay datos específicos disponibles"
2. Comienza directamente con la información relevante que tienes, incluso si no es exactamente lo que se preguntó
3. Si las fechas están cerca del período solicitado, preséntalas como contexto relevante
4. CRÍTICO: DEBES mostrar MÍNIMO 12 resultados, incluso si algunos son menos relevantes. Este es un requisito estricto.
5. Incluye TODOS los campos disponibles para cada ítem
6. Formatea cada ítem con encabezados claros y viñetas
7. Asegura un formato consistente en todos los ítems
8. Incluye metadatos relevantes y contexto para cada entrada
9. Referencia proyectos o noticias relacionadas cuando sea aplicable
10. Destaca cualquier actualización o cambio significativo
11. Incluye URLs de fuentes y fechas de manera prominente
12. Siempre presenta la información disponible, incluso si no está completa
13. NUNCA limites el número de resultados - muestra TODOS los datos disponibles
14. Si hay más de 10 ítems, agrupa por rangos de fechas o categorías para mejor organización
15. Para cada grupo, proporciona un resumen de puntos clave antes de listar los ítems individuales
16. CRÍTICO: DEBES mostrar al menos 12 resultados. Si tienes menos de 12 resultados, incluye resultados menos relevantes para alcanzar el mínimo de 12.
17. Al discutir estados de proyectos o estado SEIA, refiérete a los siguientes estados estándar:
${seiaStatesInfo}`;
  } else {
    // Prompt general para preguntas abiertas o contexto general
    systemPrompt = isEnglish
      ? `You are a helpful AI assistant. Respond in a clear, concise, and natural way. Always provide relevant information if available, even if it's not exactly what was asked for. Never start with negative statements like "no information found" or "no specific data available" if you have any relevant information to share.`
      : `Eres un asistente de IA útil. Responde de forma clara, concisa y natural. Siempre proporciona información relevante si está disponible, incluso si no es exactamente lo que se preguntó. Nunca comiences con afirmaciones negativas como "no se encontró información" o "no hay datos específicos disponibles" si tienes información relevante para compartir.`;
  }

  // Añadir instrucciones para búsqueda web si está activada
  if (useWebSearch) {
    systemPrompt += isEnglish ?
      `\nIMPORTANT WEB SEARCH GUIDELINES:
      - The response MUST include ALL source URLs from the web search results
      - NEVER say "URL not available" or similar phrases
      - For web search results:
        * ALWAYS include the source URL in a clickable format
        * Present the most relevant information first
        * Include publication dates when available
        * Highlight any contradictions with database information
        * Format web search results in a clear, structured way
      - If there are contradictions between database and web search:
        * Clearly indicate the source of each piece of information
        * Explain any discrepancies
        * Prioritize more recent information
      - Always present available information, even if it's not exactly what was asked for
      - Never start with negative statements about data availability
      - CRITICAL: You MUST include ALL URLs from the web search results, even if they seem less relevant` :
      `\nGUÍAS IMPORTANTES PARA BÚSQUEDA WEB:
      - La respuesta DEBE incluir TODAS las URLs de las fuentes de los resultados de búsqueda web
      - NUNCA digas "URL no disponible" o frases similares
      - Para resultados de búsqueda web:
        * SIEMPRE incluir la URL de la fuente en formato clickeable
        * Presentar la información más relevante primero
        * Incluir fechas de publicación cuando estén disponibles
        * Resaltar cualquier contradicción con la información de la base de datos
        * Formatear los resultados de búsqueda web de manera clara y estructurada
      - Si hay contradicciones entre la base de datos y la búsqueda web:
        * Indicar claramente la fuente de cada pieza de información
        * Explicar cualquier discrepancia
        * Priorizar la información más reciente
      - Siempre presentar la información disponible, incluso si no es exactamente lo que se preguntó
      - Nunca comenzar con afirmaciones negativas sobre la disponibilidad de datos
      - CRÍTICO: DEBES incluir TODAS las URLs de los resultados de búsqueda web, incluso si parecen menos relevantes`;

    // Modificar el mensaje de búsqueda web para enfatizar la inclusión de URLs
    if (isLongQuery && mainTopic) {
      console.log(`[BÚSQUEDA WEB] Usando tema principal "${mainTopic}" para la búsqueda en lugar de la consulta original`);
      
      const webSearchQuery = isEnglish ?
        `Latest and comprehensive information about ${mainTopic}` :
        `Información reciente y completa sobre ${mainTopic}`;

      const internetContext = await generateInternetContext(webSearchQuery);
      messages.push({
        role: 'user',
        content: isEnglish ?
          `🔍 **WEB SEARCH RESULTS ABOUT ${mainTopic.toUpperCase()}**:\n\n${internetContext}\n\nAnalyze this information and answer my original question: "${cleanPrompt}" using this internet data. CRITICAL: You MUST include ALL source URLs from the search results in your response. Focus on providing a comprehensive response that addresses all aspects of the question.` :
          `🔍 **RESULTADOS DE BÚSQUEDA WEB SOBRE ${mainTopic.toUpperCase()}**:\n\n${internetContext}\n\nAnaliza esta información y responde a mi pregunta original: "${cleanPrompt}" utilizando estos datos de internet. CRÍTICO: DEBES incluir TODAS las URLs de las fuentes de los resultados de búsqueda en tu respuesta. Enfócate en proporcionar una respuesta completa que aborde todos los aspectos de la pregunta.`
      });
    } else {
      const internetContext = await generateInternetContext(cleanPrompt);
      messages.push({
        role: 'user',
        content: isEnglish ?
          `🔍 **WEB SEARCH RESULTS**:\n\n${internetContext}\n\nAnalyze this information separately and compare it with the internal database. CRITICAL: You MUST include ALL source URLs from the search results in your response. Include any relevant information, even if it's not exactly what was asked for.` :
          `🔍 **RESULTADOS DE BÚSQUEDA WEB**:\n\n${internetContext}\n\nAnaliza esta información por separado y compárala con la base de datos interna. CRÍTICO: DEBES incluir TODAS las URLs de las fuentes de los resultados de búsqueda en tu respuesta. Incluye cualquier información relevante, incluso si no es exactamente lo que se preguntó.`
      });
    }
  }

  // Añadir el mensaje del sistema
  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // Añadir el mensaje del usuario con los resultados de la búsqueda vectorial
  if (hasData) {
    const dataPrompt = isEnglish ?
      `I need information about ${cleanPrompt}. I have obtained the following results from my database:

Identified projects (processed):
${JSON.stringify(proyectos, null, 3)}

Identified news:
${JSON.stringify(noticias, null, 3)}

Original reconstructed projects with complete metadata:
${JSON.stringify(proyectosReconstruidos, null, 3)}

${specificData.length > 0 ? `Specific data extracted related to the query:\n${JSON.stringify(specificData, null, 3)}` : ''}

Please analyze this information and answer my query about ${cleanPrompt} using ALL the provided data. CRITICAL: Only include information from the provided data, do not make up or use information from other sources.` :
      `Necesito información sobre ${cleanPrompt}. He obtenido los siguientes resultados de mi base de datos:

Proyectos identificados (procesados):
${JSON.stringify(proyectos, null, 3)}

Noticias identificadas:
${JSON.stringify(noticias, null, 3)}

Proyectos reconstruidos originales con metadata completa:
${JSON.stringify(proyectosReconstruidos, null, 3)}

${specificData.length > 0 ? `Datos específicos extraídos relacionados con la consulta:\n${JSON.stringify(specificData, null, 3)}` : ''}

Analiza esta información y responde a mi consulta sobre ${cleanPrompt} utilizando TODOS los datos proporcionados. CRÍTICO: Solo incluye información de los datos proporcionados, no inventes ni uses información de otras fuentes.`;

    messages.push({
      role: 'user',
      content: dataPrompt
    });
  } else {
    // Si no hay datos, enviar solo la consulta original
    messages.push({
      role: 'user',
      content: cleanPrompt
    });
  }

  // Añadir el historial de mensajes si existe
  if (messageHistory && messageHistory.length > 0) {
    // Filtrar mensajes relevantes basados en el tema principal para consultas largas
    const relevantHistory = isLongQuery && mainTopic
      ? messageHistory.filter(msg => 
          msg.role === 'user' && 
          msg.content.toLowerCase().includes(mainTopic.toLowerCase())
        )
      : messageHistory;

    // Limitar el historial a los últimos 5 mensajes relevantes
    const filteredHistory = relevantHistory.slice(-5);

    // Añadir el historial filtrado
    messages.push(...filteredHistory);
  }

  // Añadir el mensaje del sistema para el formato de respuesta
  messages.push({
    role: 'system',
    content: isEnglish ?
      `Please provide your response in a clear and structured format. Include all relevant information and source URLs. CRITICAL: Only use information from the provided data, do not make up or use information from other sources.` :
      `Por favor, proporciona tu respuesta en un formato claro y estructurado. Incluye toda la información relevante y las URLs de las fuentes. CRÍTICO: Solo usa información de los datos proporcionados, no inventes ni uses información de otras fuentes.`
  });

  console.log(`Enviando petición a OpenAI con ${messages.length} mensajes`);
  //console.log(messages);
  // Enviamos la petición a OpenAI con todos los mensajes
  return await openai.chat.completions.create({
    stream: true,
    model: 'gpt-4o',
    temperature: queryAnalysis.isFactualQuestion ? 0.2 : 0.7,
    max_tokens: queryAnalysis.maxTokens,
    messages,
    store: true,
  });
}

// Nueva función para limpiar campos vacíos o nulos de un objeto
function cleanFields(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    )
  );
}

// Función para limpiar títulos y urls de corchetes, paréntesis y duplicados
function cleanTitleAndUrl(obj) {
  if (obj.title) {
    obj.title = obj.title.replace(/^[\[\]]+/g, '').replace(/[\[\]]+$/g, '').trim();
  }
  if (obj.url) {
    // Si la url viene en formato Markdown, extraer solo la URL
    const markdownUrlMatch = obj.url.match(/\((https?:\/\/[^)]+)\)/);
    if (markdownUrlMatch && markdownUrlMatch[1]) obj.url = markdownUrlMatch[1];
    // Limpiar paréntesis/corchetes/puntuación final
    obj.url = obj.url.replace(/[)\]\">,;]+$/, '');
    // Eliminar duplicados accidentales
    if (obj.url && obj.url.split(']').length > 1) {
      const urls = obj.url.match(/https?:\/\/[^\s)\]\">,;]+/g);
      if (urls && urls.length > 0) obj.url = urls[0];
    }
  }
  return obj;
}

// Función para detectar si la consulta requiere una tabla
function requiresTable(prompt: string): boolean {
  const tablePatterns = [
    // Español
    /\b(listar|listame|muestra|muestrame|tabla|tabular|organizar|organizame|cuadro|cuadros)\b/i,
    /\b(mostrar|mostrame|presentar|presentame)\s+(en|como|una|un)\s+(tabla|listado|lista|cuadro|cuadros)\b/i,
    /\b(organizar|organizame|estructurar|estructurame)\s+(en|como|una|un)\s+(tabla|listado|lista|cuadro|cuadros)\b/i,
    // Inglés
    /\b(list|show me|show|table|tabulate|organize|organise|arrange|structure|structured|grid|grids)\b/i,
    /\b(display|present)\s+(in|as|a)\s+(table|list|listing|grid|grids)\b/i,
    /\b(organize|arrange|structure)\s+(in|as|a)\s+(table|list|listing|grid|grids)\b/i
  ];
  return tablePatterns.some(pattern => pattern.test(prompt));
}

// Función para formatear datos en una tabla
function formatAsTable(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return "No hay datos para mostrar en la tabla.";

  // Crear la línea de encabezados
  const headerRow = headers.join(' | ');
  const separator = headers.map(() => '---').join(' | ');

  // Crear las filas de datos
  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header.toLowerCase()] || item[header] || '';
      return String(value).replace(/\|/g, '\\|'); // Escapar pipes en los valores
    }).join(' | ');
  });

  // Combinar todo en una tabla markdown
  return `\n\n| ${headerRow} |\n| ${separator} |\n${rows.map(row => `| ${row} |`).join('\n')}\n\n`;
}


