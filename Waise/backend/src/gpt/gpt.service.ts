import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProsConsDiscusserDto, ChatRequestDto } from './dtos/chatRequest.dto';
import { chatStreamUseCase } from './use-cases/chatStream.use-case';
import OpenAI from 'openai';
import { aiChatStreamUseCase } from './use-cases/aiChat.use-case';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../messages/message.entity';
import { VectorService } from '../vector/vector.service';

import { Repository } from 'typeorm';


// Interfaz extendida para incluir conversationId
interface StreamRequestDto extends ProsConsDiscusserDto {
  conversationId?: string;
}

@Injectable()
export class GptService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  private DEEPSEEKER = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY 
  });

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly vectorService: VectorService,
  ) {}



  //---------------------------------------------------------
  // async prosConsDicusserStream({ prompt,useWebSearch }: ProsConsDiscusserDto) {
  //   try {
  //     // Usamos prosConsDicusserStreamUseCase como solicitas
  //     console.log("[BACKEND] useWebSearch recibido:", useWebSearch); 
  //     const stream = await prosConsDicusserStreamUseCase(this.openai, {
  //       prompt: prompt.substring(0, 4096),
  //       useWebSearch: !!useWebSearch 
  //     });
      
  //     // Devolvemos el stream directamente
  //     return stream;
  //   } catch (error) {
  //     console.error('Error in prosConsDicusserStream:', error);
  //     throw error;
  //   }
  // }

  async prosConsDicusserStream({ prompt, conversationId, useWebSearch, selectedLibraries, focus }: ProsConsDiscusserDto, userId: string) {
    try {
      console.log(`\n\n===========================================================`);
      console.log(`PROCESANDO CONSULTA PARA CONVERSACIÓN ACTUAL`);
      console.log(`ID DE CONVERSACIÓN: ${conversationId || 'No proporcionado'}`);
      console.log(`PROMPT ACTUAL: "${prompt}"`);
      console.log(selectedLibraries)
      console.log(`===========================================================\n`);
      
      // Si tenemos un conversationId, recuperamos el historial de mensajes
      let messageHistory: Array<{ role: string, content: string, metadata: { conversationId: string } }> = [];
      
      if (conversationId) {
        try {
          console.log(`[HISTORIAL] Recuperando mensajes para la conversación actual`);
          
          // Obtener el historial de mensajes para esta conversación
          const previousMessages = await this.messageRepository.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
          });
          
          console.log(`[HISTORIAL] Total de mensajes en esta conversación: ${previousMessages.length}`);
          
          // Mostrar cada mensaje en detalle para la conversación actual
          if (previousMessages.length > 0) {
            console.log(`\n------ HISTORIAL DE LA CONVERSACIÓN ACTUAL ------`);
            previousMessages.forEach((msg, index) => {
              const role = msg.isGpt === "true" ? "ASISTENTE" : "USUARIO";
              const date = new Date(msg.createdAt).toLocaleString();
              console.log(`\n[${index + 1}] ${role} (${date}):`);
              console.log(`${msg.text.substring(0, 200)}${msg.text.length > 200 ? '...' : ''}`);
            });
            console.log(`\n----------------------------------------------\n`);
          } else {
            console.log(`[AVISO] No hay mensajes previos en esta conversación.`);
          }
          
          // Convertir los mensajes al formato que espera OpenAI
          messageHistory = previousMessages.map(msg => ({
            role: msg.isGpt === "true" ? 'assistant' : 'user',
            content: msg.text,
            metadata: { conversationId: msg.conversationId || '' }
          }));
          
          // Mostrar estructura de mensajes para OpenAI
          console.log(`[DEBUG] Estructura de mensajes para OpenAI:`);
          messageHistory.forEach((msg, index) => {
            console.log(`  [${index + 1}] ${msg.role}: "${msg.content.substring(0, 50)}..."`);
          });
          
        } catch (error) {
          console.error(`[ERROR] Error al recuperar historial: ${error.message}`);
        }
      } else {
        console.log(`[AVISO] No se proporcionó ID de conversación, no hay historial para recuperar.`);
      }

      // Preparar los mensajes para la API, incluyendo el historial
      const messages = [
        // Primero agregamos todos los mensajes del historial
        ...messageHistory,
        // Luego agregamos el mensaje actual del usuario
        {
          role: 'user',
          content: prompt.substring(0, 4096)
        }
      ];
      
      console.log("[BACKEND] useWebSearch recibido:", useWebSearch);
      console.log("[BACKEND] userId para RAG:", userId);
      console.log("[BACKEND] Tipo de userId:", typeof userId);
      console.log("[BACKEND] Usuario autenticado correctamente:", !!userId);
      
      // Búsqueda RAG en documentos legales
      let ragContext = '';
      try {
        console.log('[BACKEND] Realizando búsqueda RAG en documentos...');
        const ragResults = await this.vectorService.searchSimilarDocuments(
          prompt,
          userId,
          5, // Top 5 resultados más relevantes
          {} // Sin filtros específicos por ahora
        );
        
        if (ragResults && ragResults.length > 0) {
          console.log(`[BACKEND] Encontrados ${ragResults.length} documentos relevantes`);
          ragContext = ragResults
            .map(result => `Documento: ${result.metadata?.filename || 'Sin nombre'}\nContenido: ${result.text}\nRelevancia: ${result.score?.toFixed(3) || 'N/A'}`)
            .join('\n\n---\n\n');
        } else {
          console.log('[BACKEND] No se encontraron documentos relevantes');
        }
      } catch (error) {
        console.error('[BACKEND] Error en búsqueda RAG:', error);
        ragContext = '';
      }
      
      // Using chatStreamUseCase for clean chat streaming
      const stream = await chatStreamUseCase(this.openai, {
        prompt: prompt.substring(0, 4096),
        useWebSearch: !!useWebSearch,
        messageHistory: messages,
        conversationId,
        selectedLibraries,
        focus,
        ragContext
      });
      
      // Devolvemos el stream directamente
      return stream;
    } catch (error) {
      console.error('Error in prosConsDicusserStream:', error);
      throw error;
    }
  }




  

    
  //------------------------------------------------------
  async deepseekstreamStream({ prompt }: ProsConsDiscusserDto) {
    return await aiChatStreamUseCase(this.DEEPSEEKER, {
      prompt,
    });
  }
}