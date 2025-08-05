// // conversationalHandling.ts
// import OpenAI from 'openai';

// // Función para detectar si una consulta es conversacional y no requiere búsqueda de proyectos
// export function isConversationalQuery(prompt: string, messageHistory: any[]): boolean {
//   // Si no hay historial, no puede ser conversacional
//   if (!messageHistory || messageHistory.length < 2) {
//     return false;
//   }
  
//   // Convertir a minúsculas para facilitar la comparación
//   const promptLower = prompt.toLowerCase();
  
//   // Patrones para identificar consultas conversacionales
//   const conversationalPatterns = [
//     // Los originales
//     /\b(mi|la|tu|primera|última|anterior|siguiente|previa)\s+(consulta|pregunta|respuesta|mensaje)\b/i,
//     /\b(qué|cuál|cómo|cuándo|quién)\s+(dije|pregunté|consulté|hablamos)\b/i,
//     /\b(repetir|recordar|resumir|resumirme)\s+(consulta|pregunta|respuesta|conversación)\b/i,
//     /\b(hablamos|conversamos|mencionamos|dijimos)\s+/i,
//     /\b(me|te)\s+(dijiste|dije|mencionaste|mencioné)\b/i,
//     /\b(gracias|muchas gracias|bueno|bien|excelente|ok|okay|perfecto)\b/i,
//     /\b(no entendí|no comprendo|puedes explicar|podrías aclarar)\b/i,
//     /\b(saludos|hola|buenos días|buenas tardes|buenas noches|adiós|hasta luego)\b/i,
//     /\b(repite|olvida|recuerda)\b/i,
//     /\b(historial|historia|nuestras)\s+/i,
  
//     // Nuevos adicionales
//     /\b(quiero saber|podrías decirme|me puedes decir)\s+(qué|cuál|cómo)\b/i,
//     /\b(podrías repetir|me repites|me puedes repetir|repite por favor)\b/i,
//     /\b(volvamos|regresemos)\s+(a|al)\s+(tema|asunto|punto)\b/i,
//     /\b(haz un resumen|resúmeme|puedes resumir|podrías resumir)\b/i,
//     /\b(qué mencionaste|qué me dijiste|qué te pregunté|qué respondí)\b/i,
//     /\b(puedes aclarar|aclaración|puedes ampliar|podrías detallar)\b/i,
//     /\b(entiendo|comprendo|de acuerdo|vale|claro)\b/i,
//     /\b(puedes ayudarme|necesito ayuda|me ayudas|puedes asistirme)\b/i,
//     /\b(no recuerdo|se me olvidó|no me acuerdo)\b/i,
//     /\b(revisemos|consultemos|volvamos a revisar)\b/i
//   ];

//   return conversationalPatterns.some(pattern => pattern.test(promptLower));
// }

// // Función para manejar consultas conversacionales
// export async function handleConversationalQuery(openai: OpenAI, prompt: string, messageHistory: any[]): Promise<any> {
//   console.log("Manejando consulta conversacional:", prompt);
  
//   // Crear sistema de mensaje para conversación
//   const systemMessage = {
//     role: "system",
//     content: `Eres un asistente conversacional amigable y útil. 
//       Estás teniendo una conversación con un usuario y debes responder a sus preguntas o comentarios de manera natural.
      
//       Si te preguntan sobre mensajes anteriores o sobre el historial de la conversación, debes responder basándote en el historial de mensajes proporcionado.
      
//       - Si te piden que recuerdes alguna consulta anterior, busca en el historial y cita textualmente.
//       - Si te preguntan cuál fue la primera o la última consulta, proporciona esa información exacta.
//       - Responde de manera directa y concisa, sin explicaciones innecesarias.`
//   };
  
//   // Crear array de mensajes para la conversación
//   const conversationMessages = [
//     systemMessage,
//     ...messageHistory,
//     // No añadimos el prompt actual porque ya debe estar en el messageHistory
//   ];
  
//   console.log(`Enviando ${conversationMessages.length} mensajes para consulta conversacional`);
  
//   // Realizar petición a OpenAI
//   return await openai.chat.completions.create({
//     stream: true,
//     model: 'gpt-4o',
//     messages: conversationMessages,
//     temperature: 0.7,
//     max_tokens: 2048,
//     store: true,
//   });
// }

// // Esta función mejorada analizará más profundamente el historial para extraer información específica
// export async function synthesizeQueryFromHistory(
//   openai: OpenAI, 
//   currentPrompt: string, 
//   messageHistory: any[]
// ): Promise<string> {
//   // Si no hay suficiente historial, retornar la consulta original
//   if (!messageHistory || messageHistory.length < 3) {
//     return currentPrompt;
//   }
  
//   try {
//     // Primero, extraer los mensajes del asistente que podrían contener información relevante
//     const assistantMessages = messageHistory.filter(msg => msg.role === 'assistant');
    
//     // Si no hay mensajes previos del asistente, mantener la consulta original
//     if (assistantMessages.length === 0) {
//       return currentPrompt;
//     }
    
//     // Extraer texto completo de los últimos 2 mensajes del asistente (contienen la información más reciente)
//     const recentAssistantContent = assistantMessages.slice(-2).map(msg => msg.content).join('\n\n');
    
//     // Crear un prompt más directivo para GPT para que extraiga información específica
//     const analysisPrompt = `
// Analiza el siguiente extracto de una conversación anterior y extrae información específica relacionada con la consulta actual del usuario.

// CONSULTA ACTUAL DEL USUARIO: "${currentPrompt}"

// EXTRACTO DE RESPUESTAS ANTERIORES DEL ASISTENTE:
// """
// ${recentAssistantContent}
// """

// TAREA:
// 1. Identifica si la consulta del usuario se refiere a algún tema, proyecto o información específica mencionada en las respuestas anteriores.
// 2. Extrae los detalles específicos relacionados con ese tema (nombres exactos, fechas, cifras, características).
// 3. No agregues información que no esté en el texto original.

// EXTRACTO DE INFORMACIÓN ESPECÍFICA (extrae solo los datos relevantes sin explicaciones adicionales):`;

//     // Primero, extraer información específica relevante del historial
//     const analysisResponse = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [{ role: 'user', content: analysisPrompt }],
//       temperature: 0.3,
//       max_tokens: 500,
//     });
    
//     const extractedInfo = analysisResponse.choices[0].message.content?.trim() || "";
    
//     console.log(`[ANÁLISIS DE HISTORIAL] Información extraída: ${extractedInfo.substring(0, 300)}...`);
    
//     // Segundo paso: reformular la consulta utilizando la información específica extraída
//     const synthesisPrompt = `
// Reformula la siguiente consulta del usuario para hacerla más específica y detallada basándote en la información extraída del historial de la conversación.

// CONSULTA ORIGINAL DEL USUARIO: "${currentPrompt}"

// INFORMACIÓN ESPECÍFICA EXTRAÍDA DEL HISTORIAL:
// """
// ${extractedInfo}
// """

// INSTRUCCIONES:
// 1. Genera una consulta reformulada que incluya términos específicos (nombres, fechas, cifras) de la información extraída.
// 2. Mantén el idioma original (español) o ingles, dependiendo de como se te pregunto.
// 3. La consulta debe ser clara, concisa y directa - no uses comillas ni formato adicional.
// 4. Incluye términos técnicos relevantes si están presentes en la información extraída.

// CONSULTA REFORMULADA:`;
    
//     // Realizar la segunda llamada al LLM para reformular la consulta
//     const synthesisResponse = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [{ role: 'user', content: synthesisPrompt }],
//       temperature: 0.3, // Temperatura baja para respuestas más precisas
//       max_tokens: 150,
//     });
    
//     // Extraer la consulta sintetizada
//     let synthesizedQuery = synthesisResponse.choices[0].message.content?.trim() || currentPrompt;
    
//     // Asegurar que la consulta no tiene comillas u otros caracteres no deseados
//     synthesizedQuery = synthesizedQuery.replace(/^["']|["']$/g, '');
    
//     console.log(`[SÍNTESIS DE CONSULTA] Original: "${currentPrompt}"`);
//     console.log(`[SÍNTESIS DE CONSULTA] Reformulada: "${synthesizedQuery}"`);
    
//     return synthesizedQuery;
//   } catch (error) {
//     console.error("[ERROR] Error al sintetizar consulta:", error);
//     // En caso de error, devolver la consulta original
//     return currentPrompt;
//   }
// }

// // Función para extraer el tema principal de la conversación actual
// export function extractMainConversationTopic(messageHistory: any[]): { 
//   mainTopic: string;
//   recentTopic: string;
//   specificEntities: string[];
// } {
//   // Si no hay suficiente historial, devolver valores predeterminados
//   if (!messageHistory || messageHistory.length < 3) {
//     return { mainTopic: '', recentTopic: '', specificEntities: [] };
//   }
  
//   // Obtener los últimos mensajes (limitado a los últimos 6 turnos)
//   const recentMessages = messageHistory.slice(-12);
  
//   // Unir el contenido de todos los mensajes recientes para análisis
//   const conversationText = recentMessages
//     .map(msg => msg.content || '')
//     .join(' ')
//     .toLowerCase();
  
//   // Patrones para detectar temas específicos en la conversación
//   const topicPatterns = [
//     { pattern: /\bminer[ií]a\b/g, topic: 'minería' },
//     { pattern: /\benerg[ií]a\b/g, topic: 'energía' },
//     { pattern: /\bsolar\b/g, topic: 'energía solar' },
//     { pattern: /\be[óo]lic[oa]\b/g, topic: 'energía eólica' },
//     { pattern: /\bproyecto[s]?\b/g, topic: 'proyectos' },
//     { pattern: /\bnoticia[s]?\b/g, topic: 'noticias' },
//     { pattern: /\bcobre\b/g, topic: 'cobre' },
//     { pattern: /\blitio\b/g, topic: 'litio' },
//     { pattern: /\bura[ní]o\b/g, topic: 'uranio' },
//     { pattern: /\binversi[óo]n\b/g, topic: 'inversión' },
//     { pattern: /\bminerales\b/g, topic: 'minerales' }
//   ];
  
//   // Contar ocurrencias de cada tema
//   const topicCounts = topicPatterns.map(({ pattern, topic }) => {
//     const matches = conversationText.match(pattern) || [];
//     return { topic, count: matches.length };
//   });
  
//   // Ordenar por cantidad de ocurrencias de mayor a menor
//   const sortedTopics = topicCounts
//     .filter(item => item.count > 0)
//     .sort((a, b) => b.count - a.count);
  
//   // Extraer entidades específicas mencionadas
//   const specificEntityPatterns = [
//     /\b(ministerio de energ[íi]a y minas)\b/gi,
//     /\b(engie|dongfang|crrc|modvion|nabla wind hub|aimen)\b/gi,
//     /\b(proyectos? e[óo]lico[s]? coihue)\b/gi,
//     /\b(continua energ[íi]as? positivas)\b/gi
//   ];
  
//   const specificEntities: string[] = [];
  
//   specificEntityPatterns.forEach(pattern => {
//     const matches = conversationText.match(pattern) || [];
//     matches.forEach(match => {
//       if (!specificEntities.includes(match)) {
//         specificEntities.push(match);
//       }
//     });
//   });
  
//   // Analizar el último intercambio para el tema más reciente
//   const lastUserMessage = recentMessages
//     .filter(msg => msg.role === 'user')
//     .slice(-1)[0]?.content || '';
    
//   const lastAssistantMessage = recentMessages
//     .filter(msg => msg.role === 'assistant')
//     .slice(-1)[0]?.content || '';
  
//   // Analizar el último intercambio
//   const lastExchangeText = (lastUserMessage + ' ' + lastAssistantMessage).toLowerCase();
  
//   // Detectar tema reciente
//   const recentTopicMatches = topicPatterns
//     .filter(({ pattern }) => pattern.test(lastExchangeText))
//     .map(({ topic }) => topic);
  
//   const recentTopic = recentTopicMatches.length > 0 
//     ? recentTopicMatches[0] 
//     : (sortedTopics.length > 0 ? sortedTopics[0].topic : '');
  
//   // El tema principal es el más frecuente en toda la conversación
//   const mainTopic = sortedTopics.length > 0 ? sortedTopics[0].topic : '';
  
//   return { 
//     mainTopic, 
//     recentTopic,
//     specificEntities: specificEntities.length > 0 
//       ? specificEntities.map(entity => entity.charAt(0).toUpperCase() + entity.slice(1).toLowerCase())
//       : []
//   };
// }

// // Función mejorada para manejar consultas abiertas como "¿qué más puedes contarme?"
// export async function handleOpenEndedQuery(
//   openai: OpenAI,
//   prompt: string,
//   messageHistory: any[]
// ): Promise<{ 
//   enhancedQuery: string;
//   isOpenEnded: boolean;
//   mainTopic: string;
// }> {
//   // Patrones para detectar consultas abiertas
//   const openEndedPatterns = [
//     /^qu[eé]\s+m[aá]s\b/i,
//     /^y\s+qu[eé]\s+m[aá]s\b/i,
//     /\bpuedes\s+contar(me|nos)\b/i,
//     /\balgo\s+m[aá]s\b/i,
//     /\botro[s]?\s+(datos?|ejemplos?|casos?)\b/i,
//     /^contin[uú]a/i,
//     /^y\s+luego/i,
//     /^sigue/i
//   ];
  

//   // conversationalHandling.ts - continuación
//   // Verificar si la consulta es abierta
//   const isOpenEnded = openEndedPatterns.some(pattern => pattern.test(prompt));
  
//   if (!isOpenEnded) {
//     // Si no es una consulta abierta, devolver la consulta original
//     return { 
//       enhancedQuery: prompt, 
//       isOpenEnded: false,
//       mainTopic: ''
//     };
//   }
  
//   console.log(`[CONSULTA ABIERTA] Detectada consulta abierta: "${prompt}"`);
  
//   // Extraer el tema principal de la conversación
//   const { mainTopic, recentTopic, specificEntities } = extractMainConversationTopic(messageHistory);
  
//   console.log(`[CONSULTA ABIERTA] Tema principal: ${mainTopic}, Tema reciente: ${recentTopic}`);
//   console.log(`[CONSULTA ABIERTA] Entidades específicas: ${specificEntities.join(', ')}`);
  
//   // Si no podemos identificar un tema, usar GPT para analizar la conversación
//   if (!mainTopic && !recentTopic && specificEntities.length === 0) {
//     // Preparar contexto reducido para GPT
//     const recentMessages = messageHistory.slice(-6);
//     const formattedContext = recentMessages.map(msg => 
//       `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content.substring(0, 300)}${msg.content.length > 300 ? '...' : ''}`
//     ).join('\n\n');
    
//     // Solicitar a GPT que identifique el tema
//     const analysisPrompt = `
// Analiza esta conversación reciente y determina cuál es el tema principal sobre el que se está hablando.

// CONVERSACIÓN RECIENTE:
// ${formattedContext}

// ÚLTIMA CONSULTA DEL USUARIO: "${prompt}"

// Basándote en este contexto, ¿cuál crees que es el tema principal de esta conversación?
// Responde con un solo tema específico, sin explicaciones adicionales. Ejemplos: "China", "energía eólica", "minería de cobre", etc.

// TEMA PRINCIPAL:`;
    
//     try {
//       const response = await openai.chat.completions.create({
//         model: 'gpt-4o',
//         messages: [{ role: 'user', content: analysisPrompt }],
//         temperature: 0.3,
//         max_tokens: 50,
//       });
      
//       const inferredTopic = response.choices[0].message.content?.trim() || '';
//       console.log(`[CONSULTA ABIERTA] Tema inferido por GPT: "${inferredTopic}"`);
      
//       // Usar este tema inferido si parece válido
//       if (inferredTopic && inferredTopic.length > 2 && inferredTopic.length < 50) {
//         // Construir una consulta específica basada en el tema inferido
//         return { 
//           enhancedQuery: `Información reciente y actualizada sobre ${inferredTopic} en el sector de energía y minería`, 
//           isOpenEnded: true,
//           mainTopic: inferredTopic
//         };
//       }
//     } catch (error) {
//       console.error("[ERROR] Error al inferir tema con GPT:", error);
//     }
//   }
  
//   // Construir una consulta mejorada basada en el tema principal o reciente
//   let topic = recentTopic || mainTopic;
  
//   // Si hay entidades específicas, priorizarlas
//   if (specificEntities.length > 0) {
//     // Usar la primera entidad específica para la consulta
//     const specificEntity = specificEntities[0];
    
//     return { 
//       enhancedQuery: `Información actualizada y novedades recientes sobre ${specificEntity} en relación con ${topic}`, 
//       isOpenEnded: true,
//       mainTopic: specificEntity
//     };
//   }
  
//   // Si solo tenemos un tema general
//   if (topic) {
//     // Consulta basada en el tema principal
//     return { 
//       enhancedQuery: `Información reciente y datos actualizados sobre ${topic} en el sector energético y minero`, 
//       isOpenEnded: true,
//       mainTopic: topic
//     };
//   }
  
//   // Si no podemos extraer ningún tema, usar una consulta general sobre energía y minería
//   return { 
//     enhancedQuery: "Información reciente y tendencias actuales en el sector energético y minero", 
//     isOpenEnded: true,
//     mainTopic: 'energía y minería'
//   };
// }


// conversationalHandling.ts
import OpenAI from 'openai';

// Función para detectar si una consulta es conversacional y no requiere búsqueda de proyectos
export function isConversationalQuery(prompt: string, messageHistory: any[]): boolean {
  // Si no hay historial, no puede ser conversacional
  if (!messageHistory || messageHistory.length < 2) {
    return false;
  }
  
  // Convertir a minúsculas para facilitar la comparación
  const promptLower = prompt.toLowerCase();
  
  // Excluir consultas que claramente buscan información sobre proyectos o temas específicos
  const searchPatterns = [
    // Spanish patterns
    /\b(haz|hacer|genera|generar|crea|crear|elabora|elaborar)\s+(un|una|el|la)?\s+(resumen|análisis|extracto|informe)\b/i,
    /\b(busca|buscar|encuentra|encontrar|dame|dame información|información sobre)\s+/i,
    /\bproyecto\s+/i,
    /\bsobre\s+(el|la|los|las)\s+/i,
    // English patterns
    /\b(make|generate|create|elaborate)\s+(a|an|the)?\s+(summary|analysis|extract|report)\b/i,
    /\b(search|find|give me|information about)\s+/i,
    /\bproject\s+/i,
    /\babout\s+(the|a|an)\s+/i
  ];
  
  // Si la consulta coincide con alguno de estos patrones, NO debe tratarse como conversacional
  if (searchPatterns.some(pattern => pattern.test(promptLower))) {
    return false;
  }
  
  // Patrones para identificar consultas conversacionales
  const conversationalPatterns = [
    // Spanish patterns
    /\b(mi|la|tu|primera|última|anterior|siguiente|previa)\s+(consulta|pregunta|respuesta|mensaje)\b/i,
    /\b(qué|cuál|cómo|cuándo|quién)\s+(dije|pregunté|consulté|hablamos)\b/i,
    /\b(repetir|recordar|resumir|resumirme)\s+(consulta|pregunta|respuesta|conversación)\b/i,
    /\b(hablamos|conversamos|mencionamos|dijimos)\s+/i,
    /\b(me|te)\s+(dijiste|dije|mencionaste|mencioné)\b/i,
    /\b(gracias|muchas gracias|bueno|bien|excelente|ok|okay|perfecto)\b/i,
    /\b(no entendí|no comprendo|puedes explicar|podrías aclarar)\b/i,
    /\b(saludos|hola|buenos días|buenas tardes|buenas noches|adiós|hasta luego)\b/i,
    /\b(repite|olvida|recuerda)\b/i,
    /\b(historial|historia|nuestras)\s+/i,
    /\b(quiero saber|podrías decirme|me puedes decir)\s+(qué|cuál|cómo)\b/i,
    /\b(podrías repetir|me repites|me puedes repetir|repite por favor)\b/i,
    /\b(volvamos|regresemos)\s+(a|al)\s+(tema|asunto|punto)\b/i,
    /\b(haz un resumen|resúmeme|puedes resumir|podrías resumir)\b/i,
    /\b(qué mencionaste|qué me dijiste|qué te pregunté|qué respondí)\b/i,
    /\b(puedes aclarar|aclaración|puedes ampliar|podrías detallar)\b/i,
    /\b(entiendo|comprendo|de acuerdo|vale|claro)\b/i,
    /\b(puedes ayudarme|necesito ayuda|me ayudas|puedes asistirme)\b/i,
    /\b(no recuerdo|se me olvidó|no me acuerdo)\b/i,
    /\b(revisemos|consultemos|volvamos a revisar)\b/i,

    // English patterns
    /\b(my|the|your|first|last|previous|next)\s+(query|question|answer|message)\b/i,
    /\b(what|which|how|when|who)\s+(did I say|did I ask|did we discuss)\b/i,
    /\b(repeat|remember|summarize|sum up)\s+(query|question|answer|conversation)\b/i,
    /\b(we talked|we discussed|we mentioned|we said)\s+/i,
    /\b(you told me|I told you|you mentioned|I mentioned)\b/i,
    /\b(thanks|thank you|good|well|excellent|ok|okay|perfect)\b/i,
    /\b(I don't understand|I don't get it|can you explain|could you clarify)\b/i,
    /\b(greetings|hello|hi|good morning|good afternoon|good evening|goodbye|see you later)\b/i,
    /\b(repeat|forget|remember)\b/i,
    /\b(history|our)\s+/i,
    /\b(I want to know|could you tell me|can you tell me)\s+(what|which|how)\b/i,
    /\b(could you repeat|repeat that|can you repeat|please repeat)\b/i,
    /\b(let's go back|let's return)\s+(to|to the)\s+(topic|subject|point)\b/i,
    /\b(make a summary|summarize|can you summarize|could you summarize)\b/i,
    /\b(what did you mention|what did you tell me|what did I ask|what did I answer)\b/i,
    /\b(can you clarify|clarification|can you expand|could you detail)\b/i,
    /\b(I understand|I get it|okay|sure|clear)\b/i,
    /\b(can you help me|I need help|can you assist me)\b/i,
    /\b(I don't remember|I forgot|I can't recall)\b/i,
    /\b(let's review|let's check|let's go back to)\b/i
  ];

  return conversationalPatterns.some(pattern => pattern.test(promptLower));
}

// Función para manejar consultas conversacionales
export async function handleConversationalQuery(
  openai: OpenAI,
  prompt: string,
  messageHistory: any[],
  options: { systemPromptPrefix?: string } = {}
): Promise<any> {
  console.log("Manejando consulta conversacional:", prompt);
  
  // Detect language of the prompt
  const languageDetectionPrompt = `Detect the language of the following text and respond with only "english" or "spanish": "${prompt}"`;
  const languageDetectionResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: languageDetectionPrompt }],
    temperature: 0.3,
    max_tokens: 10,
  });
  const detectedLanguage = languageDetectionResponse.choices[0].message.content?.trim().toLowerCase() || 'spanish';
  const isEnglish = detectedLanguage === 'english';

  // Crear sistema de mensaje para conversación
  const systemMessage = {
    role: "system",
    content: (options.systemPromptPrefix || '') + (isEnglish ? 
      `You are a friendly and helpful conversational assistant. 
      You are having a conversation with a user and should respond to their questions or comments naturally.
      
      If they ask about previous messages or conversation history, you should respond based on the provided message history.
      
      - If they ask you to remember a previous query, look in the history and quote it verbatim.
      - If they ask what was the first or last query, provide that exact information.
      - Respond directly and concisely, without unnecessary explanations.` :
      `Eres un asistente conversacional amigable y útil. 
      Estás teniendo una conversación con un usuario y debes responder a sus preguntas o comentarios de manera natural.
      
      Si te preguntan sobre mensajes anteriores o sobre el historial de la conversación, debes responder basándote en el historial de mensajes proporcionado.
      
      - Si te piden que recuerdes alguna consulta anterior, busca en el historial y cita textualmente.
      - Si te preguntan cuál fue la primera o la última consulta, proporciona esa información exacta.
      - Responde de manera directa y concisa, sin explicaciones innecesarias.`)
  };
  
  // Crear array de mensajes para la conversación
  const conversationMessages = [
    systemMessage,
    ...messageHistory,
    // No añadimos el prompt actual porque ya debe estar en el messageHistory
  ];
  
  console.log(`Enviando ${conversationMessages.length} mensajes para consulta conversacional`);
  
  // Realizar petición a OpenAI
  return await openai.chat.completions.create({
    stream: true,
    model: 'gpt-4o-mini',
    messages: conversationMessages,
    temperature: 0.7,
    max_tokens: 4096,
    store: true,
  });
}

// Esta función mejorada analizará más profundamente el historial para extraer información específica
export async function synthesizeQueryFromHistory(
  openai: OpenAI, 
  currentPrompt: string, 
  messageHistory: any[]
): Promise<string> {
  // Si no hay suficiente historial, retornar la consulta original
  if (!messageHistory || messageHistory.length < 3) {
    return currentPrompt;
  }
  
  try {
    // Primero, extraer los mensajes del asistente que podrían contener información relevante
    const assistantMessages = messageHistory.filter(msg => msg.role === 'assistant');
    
    // Si no hay mensajes previos del asistente, mantener la consulta original
    if (assistantMessages.length === 0) {
      return currentPrompt;
    }
    
    // Extraer texto completo de los últimos 2 mensajes del asistente (contienen la información más reciente)
    const recentAssistantContent = assistantMessages.slice(-2).map(msg => msg.content).join('\n\n');
    
    // Crear un prompt más directivo para GPT para que extraiga información específica
    const analysisPrompt = `
Analiza el siguiente extracto de una conversación anterior y extrae información específica relacionada con la consulta actual del usuario.

CONSULTA ACTUAL DEL USUARIO: "${currentPrompt}"

EXTRACTO DE RESPUESTAS ANTERIORES DEL ASISTENTE:
"""
${recentAssistantContent}
"""

TAREA:
1. Identifica si la consulta del usuario se refiere a algún tema, proyecto o información específica mencionada en las respuestas anteriores.
2. Extrae los detalles específicos relacionados con ese tema (nombres exactos, fechas, cifras, características).
3. No agregues información que no esté en el texto original.

EXTRACTO DE INFORMACIÓN ESPECÍFICA (extrae solo los datos relevantes sin explicaciones adicionales):`;

    // Primero, extraer información específica relevante del historial
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      max_tokens: 500,
    });
    
    const extractedInfo = analysisResponse.choices[0].message.content?.trim() || "";
    
    console.log(`[ANÁLISIS DE HISTORIAL] Información extraída: ${extractedInfo.substring(0, 300)}...`);
    
    // Segundo paso: reformular la consulta utilizando la información específica extraída
    const synthesisPrompt = `
Reformula la siguiente consulta del usuario para hacerla más específica y detallada basándote en la información extraída del historial de la conversación.

CONSULTA ORIGINAL DEL USUARIO: "${currentPrompt}"

INFORMACIÓN ESPECÍFICA EXTRAÍDA DEL HISTORIAL:
"""
${extractedInfo}
"""

INSTRUCCIONES:
1. Genera una consulta reformulada que incluya términos específicos (nombres, fechas, cifras) de la información extraída.
2. Mantén el idioma original (español) o ingles, dependiendo de como se te pregunto.
3. La consulta debe ser clara, concisa y directa - no uses comillas ni formato adicional.
4. Incluye términos técnicos relevantes si están presentes en la información extraída.

CONSULTA REFORMULADA:`;
    
    // Realizar la segunda llamada al LLM para reformular la consulta
    const synthesisResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: synthesisPrompt }],
      temperature: 0.3, // Temperatura baja para respuestas más precisas
      max_tokens: 150,
    });
    
    // Extraer la consulta sintetizada
    let synthesizedQuery = synthesisResponse.choices[0].message.content?.trim() || currentPrompt;
    
    // Asegurar que la consulta no tiene comillas u otros caracteres no deseados
    synthesizedQuery = synthesizedQuery.replace(/^["']|["']$/g, '');
    
    console.log(`[SÍNTESIS DE CONSULTA] Original: "${currentPrompt}"`);
    console.log(`[SÍNTESIS DE CONSULTA] Reformulada: "${synthesizedQuery}"`);
    
    return synthesizedQuery;
  } catch (error) {
    console.error("[ERROR] Error al sintetizar consulta:", error);
    // En caso de error, devolver la consulta original
    return currentPrompt;
  }
}

// Función para extraer el tema principal de la conversación actual
export function extractMainConversationTopic(messageHistory: any[]): { 
  mainTopic: string;
  recentTopic: string;
  specificEntities: string[];
} {
  // Si no hay suficiente historial, devolver valores predeterminados
  if (!messageHistory || messageHistory.length < 3) {
    return { mainTopic: '', recentTopic: '', specificEntities: [] };
  }
  
  // Obtener los últimos mensajes (limitado a los últimos 6 turnos)
  const recentMessages = messageHistory.slice(-12);
  
  // Unir el contenido de todos los mensajes recientes para análisis
  const conversationText = recentMessages
    .map(msg => msg.content || '')
    .join(' ')
    .toLowerCase();
  
  // Patrones para detectar temas específicos en la conversación
  const topicPatterns = [
    { pattern: /\bminer[ií]a\b/g, topic: 'minería' },
    { pattern: /\benerg[ií]a\b/g, topic: 'energía' },
    { pattern: /\bsolar\b/g, topic: 'energía solar' },
    { pattern: /\be[óo]lic[oa]\b/g, topic: 'energía eólica' },
    { pattern: /\bproyecto[s]?\b/g, topic: 'proyectos' },
    { pattern: /\bnoticia[s]?\b/g, topic: 'noticias' },
    { pattern: /\bcobre\b/g, topic: 'cobre' },
    { pattern: /\blitio\b/g, topic: 'litio' },
    { pattern: /\bura[ní]o\b/g, topic: 'uranio' },
    { pattern: /\binversi[óo]n\b/g, topic: 'inversión' },
    { pattern: /\bminerales\b/g, topic: 'minerales' }
  ];
  
  // Contar ocurrencias de cada tema
  const topicCounts = topicPatterns.map(({ pattern, topic }) => {
    const matches = conversationText.match(pattern) || [];
    return { topic, count: matches.length };
  });
  
  // Ordenar por cantidad de ocurrencias de mayor a menor
  const sortedTopics = topicCounts
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
  
  // Extraer entidades específicas mencionadas
  const specificEntityPatterns = [
    /\b(ministerio de energ[íi]a y minas)\b/gi,
    /\b(engie|dongfang|crrc|modvion|nabla wind hub|aimen)\b/gi,
    /\b(proyectos? e[óo]lico[s]? coihue)\b/gi,
    /\b(continua energ[íi]as? positivas)\b/gi
  ];
  
  const specificEntities: string[] = [];
  
  specificEntityPatterns.forEach(pattern => {
    const matches = conversationText.match(pattern) || [];
    matches.forEach(match => {
      if (!specificEntities.includes(match)) {
        specificEntities.push(match);
      }
    });
  });
  
  // Analizar el último intercambio para el tema más reciente
  const lastUserMessage = recentMessages
    .filter(msg => msg.role === 'user')
    .slice(-1)[0]?.content || '';
    
  const lastAssistantMessage = recentMessages
    .filter(msg => msg.role === 'assistant')
    .slice(-1)[0]?.content || '';
  
  // Analizar el último intercambio
  const lastExchangeText = (lastUserMessage + ' ' + lastAssistantMessage).toLowerCase();
  
  // Detectar tema reciente
  const recentTopicMatches = topicPatterns
    .filter(({ pattern }) => pattern.test(lastExchangeText))
    .map(({ topic }) => topic);
  
  const recentTopic = recentTopicMatches.length > 0 
    ? recentTopicMatches[0] 
    : (sortedTopics.length > 0 ? sortedTopics[0].topic : '');
  
  // El tema principal es el más frecuente en toda la conversación
  const mainTopic = sortedTopics.length > 0 ? sortedTopics[0].topic : '';
  
  return { 
    mainTopic, 
    recentTopic,
    specificEntities: specificEntities.length > 0 
      ? specificEntities.map(entity => entity.charAt(0).toUpperCase() + entity.slice(1).toLowerCase())
      : []
  };
}

// Función mejorada para manejar consultas abiertas como "¿qué más puedes contarme?"
export async function handleOpenEndedQuery(
  openai: OpenAI,
  prompt: string,
  messageHistory: any[]
): Promise<{ 
  enhancedQuery: string;
  isOpenEnded: boolean;
  mainTopic: string;
}> {
  // Patrones para detectar consultas abiertas
  const openEndedPatterns = [
    /^qu[eé]\s+m[aá]s\b/i,
    /^y\s+qu[eé]\s+m[aá]s\b/i,
    /\bpuedes\s+contar(me|nos)\b/i,
    /\balgo\s+m[aá]s\b/i,
    /\botro[s]?\s+(datos?|ejemplos?|casos?)\b/i,
    /^contin[uú]a/i,
    /^y\s+luego/i,
    /^sigue/i
  ];
  
  // Verificar si la consulta es abierta
  const isOpenEnded = openEndedPatterns.some(pattern => pattern.test(prompt));
  
  if (!isOpenEnded) {
    // Si no es una consulta abierta, devolver la consulta original
    return { 
      enhancedQuery: prompt, 
      isOpenEnded: false,
      mainTopic: ''
    };
  }
  
  console.log(`[CONSULTA ABIERTA] Detectada consulta abierta: "${prompt}"`);
  
  // Extraer el tema principal de la conversación
  const { mainTopic, recentTopic, specificEntities } = extractMainConversationTopic(messageHistory);
  
  console.log(`[CONSULTA ABIERTA] Tema principal: ${mainTopic}, Tema reciente: ${recentTopic}`);
  console.log(`[CONSULTA ABIERTA] Entidades específicas: ${specificEntities.join(', ')}`);
  
  // Si no podemos identificar un tema, usar GPT para analizar la conversación
  if (!mainTopic && !recentTopic && specificEntities.length === 0) {
    // Preparar contexto reducido para GPT
    const recentMessages = messageHistory.slice(-6);
    const formattedContext = recentMessages.map(msg => 
      `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content.substring(0, 300)}${msg.content.length > 300 ? '...' : ''}`
    ).join('\n\n');
    
    // Solicitar a GPT que identifique el tema
    const analysisPrompt = `
Analiza esta conversación reciente y determina cuál es el tema principal sobre el que se está hablando.

CONVERSACIÓN RECIENTE:
${formattedContext}

ÚLTIMA CONSULTA DEL USUARIO: "${prompt}"

Basándote en este contexto, ¿cuál crees que es el tema principal de esta conversación?
Responde con un solo tema específico, sin explicaciones adicionales. Ejemplos: "China", "energía eólica", "minería de cobre", etc.

TEMA PRINCIPAL:`;
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 50,
      });
      
      const inferredTopic = response.choices[0].message.content?.trim() || '';
      console.log(`[CONSULTA ABIERTA] Tema inferido por GPT: "${inferredTopic}"`);
      
      // Usar este tema inferido si parece válido
      if (inferredTopic && inferredTopic.length > 2 && inferredTopic.length < 50) {
        // Construir una consulta específica basada en el tema inferido
        return { 
          enhancedQuery: `Información reciente y actualizada sobre ${inferredTopic} en el sector de energía y minería`, 
          isOpenEnded: true,
          mainTopic: inferredTopic
        };
      }
    } catch (error) {
      console.error("[ERROR] Error al inferir tema con GPT:", error);
    }
  }
  
  // Construir una consulta mejorada basada en el tema principal o reciente
  let topic = recentTopic || mainTopic;
  
  // Si hay entidades específicas, priorizarlas
  if (specificEntities.length > 0) {
    // Usar la primera entidad específica para la consulta
    const specificEntity = specificEntities[0];
    
    return { 
      enhancedQuery: `Información actualizada y novedades recientes sobre ${specificEntity} en relación con ${topic}`, 
      isOpenEnded: true,
      mainTopic: specificEntity
    };
  }
  
  // Si solo tenemos un tema general
  if (topic) {
    // Consulta basada en el tema principal
    return { 
      enhancedQuery: `Información reciente y datos actualizados sobre ${topic} en el sector energético y minero`, 
      isOpenEnded: true,
      mainTopic: topic
    };
  }
  
  // Si no podemos extraer ningún tema, usar una consulta general sobre energía y minería
  return { 
    enhancedQuery: "Información reciente y tendencias actuales en el sector energético y minero", 
    isOpenEnded: true,
    mainTopic: 'energía y minería'
  };
}