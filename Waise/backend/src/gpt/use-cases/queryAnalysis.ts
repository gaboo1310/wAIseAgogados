// // queryAnalysis.ts
// import OpenAI from 'openai';

// // Function to analyze query parameters with better detection of specific queries
// export function analyzeQueryParams(prompt: string) {
//   // Identify if this is a specific factual question
//   const isFactualQuestion = /¿cuántos|cuantos|cuáles|cuales|cuándo|cuando|dónde|donde|quién|quien|qué|que|cómo|como\?/i.test(prompt);
  
//   const isQuantitativeQuery = /\b(número|cantidad|total|cuántos|cuantos|estadísticas|estadisticas)\b/i.test(prompt);
  
//   const hasTimeFrame = /\b(20\d\d|durante el año|último año|próximo año|reciente|futuro)\b/i.test(prompt);
  
//   const entityMatch = prompt.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b/g);
//   const hasSpecificEntities = entityMatch && entityMatch.length > 0;
  
//   const specificityLevel = calculateQuerySpecificity(prompt);
  
//   let temperature = 0.5; // Base value
//   if (isFactualQuestion || isQuantitativeQuery) temperature = 0.2; // Lower temperature for factual questions
//   if (specificityLevel > 0.7) temperature = 0.3; // More precise for very specific queries
  
//   let maxTokens = 4096; // Base value
//   if (isFactualQuestion) maxTokens = 3072; // Factual questions need less tokens
  
//   let topP = 0.9; // Base value
//   if (specificityLevel > 0.7 || isFactualQuestion) topP = 0.7; // More focused for specific or factual queries
  
//   // Adaptive score threshold based on query specificity
//   let adaptiveThreshold = 0.75; // Default threshold
//   if (specificityLevel > 0.8) adaptiveThreshold = 0.65; // Lower threshold for very specific queries
//   if (specificityLevel > 0.9) adaptiveThreshold = 0.55; // Even lower for extremely specific queries
  
//   return { 
//     temperature, 
//     maxTokens, 
//     topP, 
//     isFactualQuestion, 
//     isQuantitativeQuery, 
//     hasTimeFrame, 
//     hasSpecificEntities,
//     specificityLevel,
//     adaptiveThreshold
//   };
// }

// // Enhanced query specificity calculation
// export function calculateQuerySpecificity(prompt: string): number {
//   const lowerPrompt = prompt.toLowerCase();
  
//   // Check for specific indicators
//   const specificityIndicators = [
//     // Questions seeking specific facts
//     /¿cuántos|cuantos|cuáles|cuales|cuándo|cuando|dónde|donde|quién|quien|qué|que|cómo|como\?/i.test(prompt),
    
//     // Specific time frames
//     /\b(20\d\d|durante el año|último año|próximo año|primer trimestre|segundo trimestre)\b/i.test(prompt),
    
//     // Specific locations
//     /\b(chile|perú|peru|argentina|colombia|brasil|región de|ciudad de|zona de)\b/i.test(prompt),
    
//     // Specific entities or proper nouns - corrigiendo error TS2532
//     (prompt.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b/g) || []).length > 1,
    
//     // Specific numbers or quantities
//     /\b(\d+)\s*(unidades|equipos|mw|gwh|millones|toneladas)\b/i.test(prompt),
    
//     // Technical terms (energy, mining, etc.)
//     /\b(aerogenerador|panel solar|fotovoltaico|capacidad instalada|pala mecánica|camión minero)\b/i.test(prompt)
//   ];
  
//   // Count how many specificity indicators are present
//   const indicatorCount = specificityIndicators.filter(Boolean).length;
  
//   // Calculate specificity score (0-1)
//   return Math.min(indicatorCount / specificityIndicators.length, 1);
// }

// // Función para determinar si una consulta es seguimiento de la original
// export function isFollowUpQuery(originalQuery: string, newQuery: string): boolean {
//   // Lista de patrones que indican una consulta de seguimiento
//   const followUpPatterns = [
//     /háblame (más|de nuevo|otra vez) (sobre|acerca de)/i,
//     /cuéntame (más|de nuevo|otra vez) (sobre|acerca de)/i,
//     /explícame (más|de nuevo|otra vez) (sobre|acerca de)/i,
//     /amplía (la información|los detalles) (sobre|acerca de)/i,
//     /profundiza (en|sobre) (esto|eso|el tema|la información)/i,
//     /(la primera|la segunda|la tercera|la última|la anterior) (noticia|proyecto|información)/i,
//     /más (detalles|información) (sobre|acerca de)/i,
//     /(esto|eso|aquello) (que mencionaste|que dijiste)/i
//   ];
  
//   // Verificar si la nueva consulta contiene el texto de la original
//   const containsOriginalQuery = newQuery.toLowerCase().includes(originalQuery.toLowerCase());
  
//   // Verificar si cumple algún patrón de seguimiento
//   const matchesFollowUpPattern = followUpPatterns.some(pattern => pattern.test(newQuery));
  
//   return containsOriginalQuery || matchesFollowUpPattern;
// }

// // Enhanced query refinement with better preservation of specific terms
// export async function refineQuery(openai: OpenAI, originalPrompt: string, attemptNumber: number, queryAnalysis: any): Promise<string> {
//   // Extract potential key entities from the prompt
//   const entityMatches = originalPrompt.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b/g) || [];
//   const yearMatches = originalPrompt.match(/\b(20\d\d)\b/g) || [];
//   const numberQuantityMatches = originalPrompt.match(/\b(\d+)\s*(unidades|equipos|mw|gwh|millones|toneladas)\b/i) || [];
  
//   // Create a list of terms that must be preserved in refinements
//   const preserveTerms = [
//     ...entityMatches,
//     ...yearMatches,
//     ...(numberQuantityMatches.length > 0 ? [numberQuantityMatches[0]] : [])
//   ];
  
//   // Dynamic refinement strategies based on query type and attempt number
//   const refinementInstructions = [
//     // Strategy 1: Expand with synonyms while preserving key terms
//     `Expande la consulta original usando sinónimos y términos relacionados, pero conservando exactamente estos términos clave: ${preserveTerms.join(', ')}`,
    
//     // Strategy 2: Add technical terms and specifications
//     `Enriquece la consulta con términos técnicos específicos relevantes al tema, manteniendo la esencia de la pregunta original.`,
    
//     // Strategy 3: Generalize slightly to capture related concepts
//     `Reformula la consulta para incluir conceptos relacionados y ampliar ligeramente el alcance, pero manteniendo el enfoque en ${preserveTerms.join(', ')}.`,
    
//     // Strategy 4: Add industry-specific terminology
//     `Añade terminología específica del sector relevante (energía, minería, etc.) que pueda ayudar a encontrar documentos técnicos relacionados.`,
    
//     // Strategy 5: Focus on factual/quantitative aspects
//     `Enfoca la consulta en aspectos factuales y cuantitativos específicos, destacando preguntas sobre cantidades, fechas, ubicaciones o estadísticas.`
//   ];
  
//   // Choose appropriate instruction based on query analysis and attempt number
//   let instructionIndex = attemptNumber % refinementInstructions.length;
  
//   // For very specific queries, prioritize preserving specificity
//   if (queryAnalysis.specificityLevel > 0.8 && attemptNumber === 0) {
//     instructionIndex = 0; // Use strategy 1 first for very specific queries
//   }
  
//   // For factual questions, prioritize the factual refinement strategy
//   if (queryAnalysis.isFactualQuestion && attemptNumber === 0) {
//     instructionIndex = 4; // Use strategy 5 first for factual questions
//   }
  
//   const refinementResponse = await openai.chat.completions.create({
//     model: 'gpt-4o',
//     temperature: 0.3, // Lower temperature for more consistent refinements
//     max_tokens: 300,
//     messages: [
//       {
//         role: 'system',
//         content: `Eres un especialista en refinamiento de consultas para búsquedas vectoriales en español.
        
//         INSTRUCCIONES CRÍTICAS:
//         - NUNCA elimines los términos específicos de la consulta original (nombres propios, fechas, cantidades)
//         - Mantén el idioma original de la consulta (español)
//         - Preserva SIEMPRE el sentido fundamental de la pregunta
//         - No agregues información no presente o implicada en la consulta original
//         - Si la consulta menciona años específicos (como "2025"), asegúrate de mantenerlos
//         - Para consultas factuales (¿cuántos?, ¿cuáles?, etc.), preserva la naturaleza de la pregunta
        
//         Tu objetivo es refinar la consulta para mejorar los resultados de búsqueda manteniendo la especificidad original.`
//       },
//       {
//         role: 'user',
//         content: `Consulta original: "${originalPrompt}"
      
//         Términos que DEBEN preservarse: ${preserveTerms.join(', ')}
        
//         Instrucción específica: ${refinementInstructions[instructionIndex]}
        
//         Proporciona ÚNICAMENTE la consulta refinada, sin explicaciones ni comentarios adicionales.`
//       }
//     ]
//   });

//   return refinementResponse.choices[0].message.content?.trim() || originalPrompt;
// }


// queryAnalysis.ts
import OpenAI from 'openai';

// Function to analyze query parameters with better detection of specific queries
export function analyzeQueryParams(prompt: string) {
  // Identify if this is a specific factual question
  const isFactualQuestion = /¿cuántos|cuantos|cuáles|cuales|cuándo|cuando|dónde|donde|quién|quien|qué|que|cómo|como\?/i.test(prompt);
  
  const isQuantitativeQuery = /\b(número|cantidad|total|cuántos|cuantos|estadísticas|estadisticas)\b/i.test(prompt);
  
  const hasTimeFrame = /\b(20\d\d|durante el año|último año|próximo año|reciente|futuro)\b/i.test(prompt);
  
  const entityMatch = prompt.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b/g);
  const hasSpecificEntities = entityMatch && entityMatch.length > 0;
  
  // Detectar comandos explícitos de búsqueda o resumen
  const hasSearchCommand = /\b(busca|buscar|encuentra|encontrar|dame información sobre)\b/i.test(prompt);
  const hasSummaryCommand = /\b(haz|hacer|genera|generar|crea|crear|elabora|elaborar)\s+(un|una|el|la)?\s+(resumen|análisis|extracto|informe)\b/i.test(prompt);
  
  const specificityLevel = calculateQuerySpecificity(prompt);
  
  let temperature = 0.5; // Base value
  if (isFactualQuestion || isQuantitativeQuery) temperature = 0.1; // Lower temperature for factual questions
  if (specificityLevel > 0.7) temperature = 0.2; // More precise for very specific queries
  

  let maxTokens = 4096; // Base value
  //let maxTokens = 2048; // Base value
  
  if (isFactualQuestion) maxTokens = 4096; // Increased tokens for factual questions
  
  let topP = 0.9; // Base value
  if (specificityLevel > 0.7 || isFactualQuestion) topP = 0.8; // More focused for specific or factual queries
  
  // Adaptive score threshold based on query specificity and command presence
  let adaptiveThreshold = 0.65; // Lower base threshold to get more results
  if (specificityLevel > 0.8) adaptiveThreshold = 0.7;
  if (isFactualQuestion) adaptiveThreshold = 0.6;
  if (hasTimeFrame) adaptiveThreshold = 0.55;
  if (hasSpecificEntities) adaptiveThreshold = 0.5;
  
  return { 
    temperature, 
    maxTokens, 
    topP, 
    isFactualQuestion, 
    isQuantitativeQuery, 
    hasTimeFrame, 
    hasSpecificEntities,
    specificityLevel,
    adaptiveThreshold,
    hasSearchCommand,
    hasSummaryCommand
  };
}

// Enhanced query specificity calculation
export function calculateQuerySpecificity(prompt: string): number {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for specific indicators
  const specificityIndicators = [
    // Questions seeking specific facts
    /¿cuántos|cuantos|cuáles|cuales|cuándo|cuando|dónde|donde|quién|quien|qué|que|cómo|como\?/i.test(prompt),
    
    // Specific time frames
    /\b(20\d\d|durante el año|último año|próximo año|primer trimestre|segundo trimestre)\b/i.test(prompt),
    
    // Specific locations
    /\b(chile|perú|peru|argentina|colombia|brasil|región de|ciudad de|zona de)\b/i.test(prompt),
    
    // Specific entities or proper nouns - corrigiendo error TS2532
    (prompt.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b/g) || []).length > 1,
    
    // Specific numbers or quantities
    /\b(\d+)\s*(unidades|equipos|mw|gwh|millones|toneladas)\b/i.test(prompt),
    
    // Technical terms (energy, mining, etc.)
    /\b(aerogenerador|panel solar|fotovoltaico|capacidad instalada|pala mecánica|camión minero)\b/i.test(prompt),
    
    // Comandos explícitos de búsqueda
    /\b(busca|buscar|encuentra|encontrar|dame información sobre)\b/i.test(prompt),
    
    // Comandos explícitos de resumen/análisis
    /\b(haz|hacer|genera|generar|crea|crear|elabora|elaborar)\s+(un|una|el|la)?\s+(resumen|análisis|extracto|informe)\b/i.test(prompt),
    
    // Proyectos específicos 
    /\bproyecto\s+[a-záéíóúñ\s]{3,}\b/i.test(prompt),
    
    // Sobre proyectos específicos
    /\bsobre\s+(el|la|los|las)\s+proyecto\s+[a-záéíóúñ\s]+\b/i.test(prompt)
  ];
  
  // Contar cuántos indicadores de especificidad están presentes
  const indicatorCount = specificityIndicators.filter(Boolean).length;
  
  // Si la consulta menciona explícitamente "proyecto" seguido de un nombre, aumentar significativamente la especificidad
  if (/\bproyecto\s+[a-záéíóúñ\s]{3,}\b/i.test(lowerPrompt)) {
    return Math.min(0.8 + (indicatorCount / specificityIndicators.length * 0.2), 1);
  }
  
  // Si la consulta contiene comandos explícitos de búsqueda o resumen, aumentar la especificidad
  if (/\b(busca|buscar|encuentra|encontrar|dame información sobre)\b/i.test(lowerPrompt) ||
      /\b(haz|hacer|genera|generar|crea|crear|elabora|elaborar)\s+(un|una|el|la)?\s+(resumen|análisis|extracto|informe)\b/i.test(lowerPrompt)) {
    return Math.min(0.7 + (indicatorCount / specificityIndicators.length * 0.3), 1);
  }
  
  // Cálculo estándar de especificidad
  return Math.min(indicatorCount / specificityIndicators.length, 1);
}

// Función para determinar si una consulta es seguimiento de la original
export function isFollowUpQuery(originalQuery: string, newQuery: string): boolean {
  // Lista de patrones que indican una consulta de seguimiento
  const followUpPatterns = [
    /háblame (más|de nuevo|otra vez) (sobre|acerca de)/i,
    /cuéntame (más|de nuevo|otra vez) (sobre|acerca de)/i,
    /explícame (más|de nuevo|otra vez) (sobre|acerca de)/i,
    /amplía (la información|los detalles) (sobre|acerca de)/i,
    /profundiza (en|sobre) (esto|eso|el tema|la información)/i,
    /(la primera|la segunda|la tercera|la última|la anterior) (noticia|proyecto|información)/i,
    /más (detalles|información) (sobre|acerca de)/i,
    /(esto|eso|aquello) (que mencionaste|que dijiste)/i
  ];
  
  // Verificar si la nueva consulta contiene el texto de la original
  const containsOriginalQuery = newQuery.toLowerCase().includes(originalQuery.toLowerCase());
  
  // Verificar si cumple algún patrón de seguimiento
  const matchesFollowUpPattern = followUpPatterns.some(pattern => pattern.test(newQuery));
  
  return containsOriginalQuery || matchesFollowUpPattern;
}

// Enhanced query refinement with better preservation of specific terms
export async function refineQuery(openai: OpenAI, originalPrompt: string, attemptNumber: number, queryAnalysis: any): Promise<string> {
  // Extract potential key entities from the prompt
  const entityMatches = originalPrompt.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b/g) || [];
  const yearMatches = originalPrompt.match(/\b(20\d\d)\b/g) || [];
  const numberQuantityMatches = originalPrompt.match(/\b(\d+)\s*(unidades|equipos|mw|gwh|millones|toneladas)\b/i) || [];
  
  // Extraer nombres de proyectos si hay alguno mencionado
  const projectMatches = originalPrompt.match(/\bproyecto\s+([a-záéíóúñ\s]{3,}?)(?:\b|$)/i);
  const projectName = projectMatches && projectMatches[1] ? projectMatches[1].trim() : null;
  
  // Create a list of terms that must be preserved in refinements
  const preserveTerms = [
    ...entityMatches,
    ...yearMatches,
    ...(numberQuantityMatches.length > 0 ? [numberQuantityMatches[0]] : []),
    ...(projectName ? [projectName] : [])
  ];
  
  // Dynamic refinement strategies based on query type and attempt number
  const refinementInstructions = [
    // Strategy 1: Expand with synonyms while preserving key terms
    `Expande la consulta original usando sinónimos y términos relacionados, pero conservando exactamente estos términos clave: ${preserveTerms.join(', ')}`,
    
    // Strategy 2: Add technical terms and specifications
    `Enriquece la consulta con términos técnicos específicos relevantes al tema, manteniendo la esencia de la pregunta original.`,
    
    // Strategy 3: Generalize slightly to capture related concepts
    `Reformula la consulta para incluir conceptos relacionados y ampliar ligeramente el alcance, pero manteniendo el enfoque en ${preserveTerms.join(', ')}.`,
    
// Strategy 4: Add industry-specific terminology
`Añade terminología específica del sector relevante (energía, minería, etc.) que pueda ayudar a encontrar documentos técnicos relacionados.`,
    
// Strategy 5: Focus on factual/quantitative aspects
`Enfoca la consulta en aspectos factuales y cuantitativos específicos, destacando preguntas sobre cantidades, fechas, ubicaciones o estadísticas.`
];

// Choose appropriate instruction based on query analysis and attempt number
let instructionIndex = attemptNumber % refinementInstructions.length;

// Para comandos de búsqueda o resumen, priorizar preservación de la intención
if (queryAnalysis.hasSearchCommand || queryAnalysis.hasSummaryCommand) {
instructionIndex = 0; // Usar estrategia 1 para comandos explícitos
}
// For very specific queries, prioritize preserving specificity
else if (queryAnalysis.specificityLevel > 0.8 && attemptNumber === 0) {
instructionIndex = 0; // Use strategy 1 first for very specific queries
}
// For factual questions, prioritize the factual refinement strategy
else if (queryAnalysis.isFactualQuestion && attemptNumber === 0) {
instructionIndex = 4; // Use strategy 5 first for factual questions
}

const refinementResponse = await openai.chat.completions.create({
model: 'gpt-4o-mini',
temperature: 0.3, // Lower temperature for more consistent refinements
max_tokens: 300,
messages: [
  {
    role: 'system',
    content: `Eres un especialista en refinamiento de consultas para búsquedas vectoriales en español.
    
    INSTRUCCIONES CRÍTICAS:
    - NUNCA elimines los términos específicos de la consulta original (nombres propios, fechas, cantidades)
    - Mantén el idioma original de la consulta (español)
    - Preserva SIEMPRE el sentido fundamental de la pregunta
    - No agregues información no presente o implicada en la consulta original
    - Si la consulta menciona años específicos (como "2025"), asegúrate de mantenerlos
    - Para consultas factuales (¿cuántos?, ¿cuáles?, etc.), preserva la naturaleza de la pregunta
    - Si hay comandos como "busca" o "haz un resumen", MANTÉN estos comandos en la consulta refinada
    
    Tu objetivo es refinar la consulta para mejorar los resultados de búsqueda manteniendo la especificidad original.`
  },
  {
    role: 'user',
    content: `Consulta original: "${originalPrompt}"
  
    Términos que DEBEN preservarse: ${preserveTerms.join(', ')}
    
    Instrucción específica: ${refinementInstructions[instructionIndex]}
    
    Proporciona ÚNICAMENTE la consulta refinada, sin explicaciones ni comentarios adicionales.`
  }
]
});

return refinementResponse.choices[0].message.content?.trim() || originalPrompt;
}