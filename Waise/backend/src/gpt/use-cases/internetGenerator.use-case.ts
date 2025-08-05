export const generateInternetContext = async (prompt: string): Promise<string> => {
  console.log(`[🌐 BusquedaWeb] Generando contexto para prompt: "${prompt}"`);
  
  try {
    // Extraer palabras clave del prompt
    const keywords = extractKeywords(prompt);
    console.log(`[🌐 BusquedaWeb] Palabras clave extraídas: ${keywords.join(', ')}`);
    
    // Configuración de la API de Serper
    const serperApiKey = process.env.SERPER_API_KEY;
    
    if (!serperApiKey) {
      throw new Error('API key de Serper no encontrada');
    }
    
    // Realizar búsqueda con las palabras clave
    //    const searchQuery = keywords.join(' ');

    const searchQuery = prompt; // no usar palabras clave
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        gl: 'cl',
        hl: 'en', //es
        num: 10
        //page: 1,
        //sort: 'relevance',
      })
    });
    
    
    if (!response.ok) {
      throw new Error(`Error en la API de Serper: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Estructurar la información por categorías
    const contextoEstructurado = estructurarContexto(data, prompt);
    
    return contextoEstructurado;
    
  } catch (error) {
    console.error('[🌐 BusquedaWeb] Error:', error);
    return `No se pudo obtener información de internet para "${prompt}" debido a un error: ${error.message}`;
  }
};

// Función mejorada para extraer palabras clave
const extractKeywords = (prompt: string): string[] => {
  // Eliminar palabras comunes y signos de puntuación
  const commonWords = new Set(['que', 'cual', 'como', 'donde', 'cuando', 'quien', 'por', 'para', 'con', 'sin', 'sobre', 'bajo', 'entre', 'durante', 'desde', 'hasta', 'hacia', 'según', 'mediante', 'respecto', 'acerca', 'sobre', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'so', 'sobre', 'tras', 'versus', 'vía']);
  
  // Limpiar la consulta de símbolos de interrogación y otros caracteres especiales
  const cleanText = prompt
    .replace(/[¿?¡!]/g, '') // Eliminar símbolos de interrogación y exclamación
    .replace(/["'`]/g, '')  // Eliminar comillas
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ') // Reemplazar otros signos de puntuación con espacios
    .replace(/\s{2,}/g, ' ') // Normalizar espacios múltiples
    .trim();
  
  // Convertir a minúsculas después de la limpieza
  const normalizedText = cleanText.toLowerCase();
  
  // Dividir en palabras y filtrar
  const words = normalizedText.split(' ');
  
  // Filtrar palabras comunes y palabras cortas
  const keywords = words.filter(word => 
    word.length > 3 && 
    !commonWords.has(word) &&
    !/^\d+$/.test(word) // Excluir números solos
  );
  
  // Si la consulta es muy larga, priorizar sustantivos y verbos
  if (keywords.length > 5) {
    // Mantener solo las palabras más relevantes (primeras y últimas)
    const relevantKeywords = [
      ...keywords.slice(0, 3), // Primeras palabras
      ...keywords.slice(-3)    // Últimas palabras
    ];
    return [...new Set(relevantKeywords)]; // Eliminar duplicados
  }
  
  return [...new Set(keywords)]; // Eliminar duplicados
};

// Función para estructurar el contexto basado en los resultados
const estructurarContexto = (data: any, prompt: string): string => {
  let contexto = `🔍 **RESULTADOS DE BÚSQUEDA WEB PARA: "${prompt}"**\n\n`;
  
  // Sección de información general
  if (data.knowledgeGraph) {
    contexto += `## 📚 Información General\n`;
    const kg = data.knowledgeGraph;
    contexto += `**${kg.title || 'Sin título'}**: ${kg.description || 'Sin descripción'}\n`;
    
    if (kg.attributes) {
      Object.entries(kg.attributes).forEach(([key, value]) => {
        contexto += `- **${key}**: ${value}\n`;
      });
    }
    // Añadir URL de la fuente si está disponible
    if (kg.sourceUrl) {
      contexto += `🔗 **Fuente**: [${kg.sourceUrl}](${kg.sourceUrl})\n`;
    }
    contexto += `\n`;
  }
  
  // Sección de resultados orgánicos
  if (data.organic && data.organic.length > 0) {
    contexto += `## 📑 Fuentes Principales\n`;
    // Filtrar resultados que no sean de iimp.org.pe
    const filteredOrganic = data.organic.filter((item: any) => !item.link?.includes('iimp.org.pe'));
    filteredOrganic.slice(0, 10).forEach((item: any, index: number) => {
      contexto += `### ${index + 1}. ${item.title ? item.title.replace(/[\[\]]/g, '').trim() : 'Sin título'}\n`;
      contexto += `${item.snippet}\n`;
      // Asegurar que siempre se incluya la URL
      if (item.link) {
        contexto += `🔗 **Fuente**: [${item.link}](${item.link})\n\n`;
      } else {
        contexto += `⚠️ **URL no disponible**\n\n`;
      }
    });
  }
  
  // Sección de noticias
  if (data.news && data.news.length > 0) {
    contexto += `## 📰 Noticias Recientes\n`;
    // Filtrar noticias que no sean de iimp.org.pe
    const filteredNews = data.news.filter((item: any) => !item.link?.includes('iimp.org.pe'));
    filteredNews.slice(0, 3).forEach((item: any, index: number) => {
      contexto += `### ${index + 1}. ${item.title}\n`;
      contexto += `${item.snippet}\n`;
      contexto += `📅 **Fecha**: ${item.date || 'Sin fecha'}\n`;
      // Asegurar que siempre se incluya la URL
      if (item.link) {
        contexto += `🔗 **Fuente**: [${item.source || item.link}](${item.link})\n\n`;
      } else {
        contexto += `⚠️ **URL no disponible**\n\n`;
      }
    });
  }
  
  // Sección de preguntas relacionadas
  if (data.relatedSearches && data.relatedSearches.length > 0) {
    contexto += `## 🔍 Consultas Relacionadas\n`;
    data.relatedSearches.slice(0, 5).forEach((item: any) => {
      contexto += `- ${item.query}\n`;
    });
    contexto += `\n`;
  }
  
  // Estadísticas de la búsqueda
  contexto += `## 📊 Estadísticas de la Búsqueda\n`;
  contexto += `- Total de resultados encontrados: ${data.searchParameters?.totalResults || 'Desconocido'}\n`;
  contexto += `- Búsqueda realizada el: ${new Date().toLocaleString('es-ES')}\n\n`;
  
  // Añadir nota sobre la fuente de la información
  contexto += `> ℹ️ **Nota**: Esta información ha sido obtenida mediante búsqueda web. Todas las fuentes deben ser verificadas para información más reciente.\n\n`;
  
  // Verificar si hay URLs disponibles
  const hasUrls = contexto.includes('🔗 **Fuente**:');
  if (!hasUrls) {
    contexto += `⚠️ **Advertencia**: No se encontraron URLs de fuentes en los resultados de la búsqueda.\n\n`;
  }
  
  console.log(contexto);
  return contexto;
};