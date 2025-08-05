// conversationCache.ts
import { ConversationCache } from './types';

const conversationCacheStore = new Map<string, ConversationCache>();

// Función para obtener resultados de caché
export function getConversationCache(conversationId: string): ConversationCache | null {
  if (!conversationId || !conversationCacheStore.has(conversationId)) {
    return null;
  }
  
  const cache = conversationCacheStore.get(conversationId);
  
  // Actualizar timestamp de último acceso
  if (cache) {
    cache.lastAccessed = new Date();
    conversationCacheStore.set(conversationId, cache);
    return cache;
  }
  return null;
}

// Función para guardar resultados en caché
export function saveConversationCache(
  conversationId: string,
  originalQuery: string,
  structuredProjects: any[],
  proyectos: any[],
  noticias: any[],
  specificData: any[],
  proyectosReconstruidos: any[]
): void {
  if (!conversationId) return;
  
  // Limitar el tamaño de la caché (opcional)
  if (conversationCacheStore.size > 100) {
    // Eliminar la entrada más antigua si hay demasiadas
    const oldest = [...conversationCacheStore.entries()]
      .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime())[0];
    
    if (oldest) {
      conversationCacheStore.delete(oldest[0]);
    }
  }
  
  // Guardar nueva caché
  conversationCacheStore.set(conversationId, {
    originalQuery,
    searchResults: {
      structuredProjects,
      proyectos,
      noticias,
      specificData,
      proyectosReconstruidos
    },
    lastAccessed: new Date()
  });
  
  console.log(`[CACHÉ] Guardados resultados de búsqueda para conversación ${conversationId}`);
}

// Función auxiliar para extraer el conversationId del historial de mensajes
export function extractConversationId(messageHistory: any[]): string | null {
  // Buscar en los metadatos de los mensajes si están disponibles
  if (messageHistory && messageHistory.length > 0) {
    for (const message of messageHistory) {
      // Verificar si hay metadatos con conversationId
      if (message.metadata && message.metadata.conversationId) {
        return message.metadata.conversationId;
      }
    }
  }
  
  // Si no se encuentra en los metadatos, devolver null
  return null;
}