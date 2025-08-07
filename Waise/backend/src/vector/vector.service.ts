import { Injectable } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

interface VectorData {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    userId: string;
    filename: string;
    documentType: string;
    chunkIndex: number;
    totalChunks: number;
    pageNumber?: number;
    section?: string;
    [key: string]: any;
  };
}

interface EmbeddingChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: any;
}

@Injectable()
export class VectorService {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private indexName: string;

  constructor() {
    // Inicializar Pinecone
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    
    // Inicializar OpenAI para embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    
    this.indexName = process.env.PINECONE_INDEX_NAME || 'abogadodocument';
    
    console.log('[VectorService] Initialized with index:', this.indexName);
  }

  async addDocumentToVector(vectorData: VectorData): Promise<string[]> {
    console.log(`[VectorService] Adding document to vector store: ${vectorData.metadata.filename}`);
    
    try {
      // 1. Dividir el texto en chunks
      const chunks = this.splitTextIntoChunks(vectorData.text, 1000, 200);
      console.log(`[VectorService] Split document into ${chunks.length} chunks`);

      // 2. Generar embeddings para cada chunk
      const embeddingChunks = await this.generateEmbeddingsForChunks(chunks, vectorData);
      
      // 3. Preparar vectors para Pinecone
      const vectors = embeddingChunks.map(chunk => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: chunk.metadata,
      }));

      // 4. Upsert vectors a Pinecone
      const index = this.pinecone.index(this.indexName);
      
      // Dividir en batches de 100 vectors (límite de Pinecone)
      const batchSize = 100;
      const chunkIds: string[] = [];
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
        
        batch.forEach(v => chunkIds.push(v.id));
        console.log(`[VectorService] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
      }

      console.log(`[VectorService] Successfully added ${chunkIds.length} chunks to vector store`);
      return chunkIds;

    } catch (error) {
      console.error('[VectorService] Error adding document to vector store:', error);
      throw new Error(`Failed to add document to vector store: ${error.message}`);
    }
  }

  async searchSimilarDocuments(
    query: string, 
    userId: string, 
    topK: number = 10,
    filters?: any
  ): Promise<any[]> {
    console.log(`[VectorService] Searching for similar documents: "${query}"`);
    
    try {
      // 1. Generar embedding para la query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // 2. Preparar filtros
      const searchFilters: any = {
        userId: { $eq: userId }
      };
      
      if (filters?.documentType) {
        searchFilters.documentType = { $eq: filters.documentType };
      }
      
      if (filters?.documentIds && filters.documentIds.length > 0) {
        searchFilters.documentId = { $in: filters.documentIds };
      }

      // 3. Buscar en Pinecone
      const index = this.pinecone.index(this.indexName);
      const searchResult = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: searchFilters,
      });

      console.log(`[VectorService] Found ${searchResult.matches?.length || 0} similar chunks`);
      
      // 4. Procesar resultados
      const results = (searchResult.matches || []).map(match => ({
        id: match.id,
        score: match.score,
        text: match.metadata?.text || '',
        metadata: match.metadata,
      }));

      return results;

    } catch (error) {
      console.error('[VectorService] Error searching similar documents:', error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  async deleteDocumentFromVector(documentId: string, chunkIds?: string[]): Promise<boolean> {
    console.log(`[VectorService] Deleting document from vector store: ${documentId}`);
    
    try {
      const index = this.pinecone.index(this.indexName);

      if (chunkIds && chunkIds.length > 0) {
        // Eliminar chunks específicos
        await index.deleteMany(chunkIds);
        console.log(`[VectorService] Deleted ${chunkIds.length} chunks`);
      } else {
        // Primero buscar todos los IDs del documento
        const queryResult = await index.query({
          vector: new Array(1024).fill(0), // Vector dummy con dimensión correcta
          topK: 1000,
          includeMetadata: true,
          filter: {
            documentId: { $eq: documentId }
          }
        });
        
        const idsToDelete = (queryResult.matches || []).map(match => match.id);
        
        if (idsToDelete.length > 0) {
          await index.deleteMany(idsToDelete);
          console.log(`[VectorService] Deleted ${idsToDelete.length} chunks for document ${documentId}`);
        } else {
          console.log(`[VectorService] No chunks found for document ${documentId}`);
        }
      }

      return true;

    } catch (error) {
      console.error('[VectorService] Error deleting document from vector store:', error);
      return false;
    }
  }

  async getDocumentChunks(documentId: string): Promise<any[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Buscar todos los chunks del documento
      const searchResult = await index.query({
        vector: new Array(1024).fill(0), // Vector dummy con dimensión correcta
        topK: 1000, // Máximo chunks por documento
        includeMetadata: true,
        filter: {
          documentId: { $eq: documentId }
        },
      });

      return (searchResult.matches || []).map(match => ({
        id: match.id,
        metadata: match.metadata,
      }));

    } catch (error) {
      console.error('[VectorService] Error getting document chunks:', error);
      return [];
    }
  }

  private splitTextIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // Si no es el último chunk, intentar cortar en un espacio para no partir palabras
      if (end < text.length) {
        const lastSpaceIndex = text.lastIndexOf(' ', end);
        if (lastSpaceIndex > start + chunkSize * 0.8) {
          end = lastSpaceIndex;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = Math.max(start + chunkSize - overlap, end - overlap);
    }

    return chunks.filter(chunk => chunk.length > 50); // Filtrar chunks muy pequeños
  }

  private async generateEmbeddingsForChunks(chunks: string[], vectorData: VectorData): Promise<EmbeddingChunk[]> {
    const embeddingChunks: EmbeddingChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${vectorData.id}_chunk_${i}`;
      
      try {
        const embedding = await this.generateEmbedding(chunk);
        
        embeddingChunks.push({
          id: chunkId,
          text: chunk,
          embedding,
          metadata: {
            ...vectorData.metadata,
            text: chunk, // Incluir texto en metadata para recuperación
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        });

        // Pequeña pausa para evitar rate limiting
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`[VectorService] Error generating embedding for chunk ${i}:`, error);
        // Continuar con los demás chunks
      }
    }

    return embeddingChunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Más económico que ada-002
        input: text.substring(0, 8000), // Límite de tokens
        dimensions: 1024, // Forzar dimensiones para coincidir con el índice Pinecone
      });

      return response.data[0].embedding;

    } catch (error) {
      console.error('[VectorService] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  // Método para probar la conexión
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('[VectorService] Testing Pinecone connection...');
      
      // 1. Test básico de conectividad
      const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
      
      // 2. Test de OpenAI embeddings
      const testEmbedding = await this.generateEmbedding('test connection');
      
      return {
        success: true,
        message: 'Vector service connection successful',
        details: {
          indexName: this.indexName,
          vectorCount: indexStats.totalRecordCount,
          dimension: indexStats.dimension,
          embeddingDimension: testEmbedding.length,
        }
      };

    } catch (error) {
      console.error('[VectorService] Connection test failed:', error);
      return {
        success: false,
        message: `Vector service connection failed: ${error.message}`,
      };
    }
  }
}