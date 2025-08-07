import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';

interface FileContent {
  filename: string;
  path: string;
  content: string;
  type: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async fillDocument(
    documentTemplate: string,
    filesContent: FileContent[],
    documentType: string,
    userId: string
  ): Promise<{ filledDocument: string; usedFiles: string[]; processingTime: number }> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Starting AI document filling process');
      console.log('Template length:', documentTemplate.length);
      console.log('Files to process:', filesContent.length);
      
      // Preparar el contexto de los archivos
      const filesContext = filesContent
        .filter(file => file.type === 'text' && file.content.trim().length > 0)
        .map(file => `
=== DOCUMENTO: ${file.filename} ===
${file.content}
=== FIN DOCUMENTO ===
        `)
        .join('\n\n');

      if (filesContext.trim().length === 0) {
        throw new BadRequestException('No se encontró contenido de texto válido en los archivos seleccionados');
      }

      // Crear el prompt específico según el tipo de documento
      const systemPrompt = this.getSystemPrompt(documentType);
      const userPrompt = `
PLANTILLA DEL DOCUMENTO A COMPLETAR:
${documentTemplate}

INFORMACIÓN DISPONIBLE DE LOS ARCHIVOS:
${filesContext}

INSTRUCCIONES:
1. Analiza cuidadosamente la información de los archivos
2. Completa la plantilla del documento reemplazando los espacios en blanco (____________) con información relevante extraída de los archivos
3. Si no encuentras información específica para algún campo, déjalo como está o marca con [INFORMACIÓN NO DISPONIBLE]
4. Mantén el formato HTML y la estructura del documento original
5. Asegúrate de que la información sea coherente y esté en el contexto correcto

Por favor, devuelve SOLAMENTE el documento completado en formato HTML, sin explicaciones adicionales.
      `;

      console.log('🤖 Calling OpenAI API...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const filledContent = response.choices[0]?.message?.content;
      
      if (!filledContent) {
        throw new Error('No se recibió respuesta válida de la IA');
      }

      const processingTime = Date.now() - startTime;
      const usedFiles = filesContent
        .filter(file => file.type === 'text' && file.content.trim().length > 0)
        .map(file => file.filename);

      console.log('✅ AI document filling completed successfully');
      console.log('Processing time:', processingTime, 'ms');
      console.log('Used files:', usedFiles.length);

      return {
        filledDocument: filledContent,
        usedFiles,
        processingTime
      };

    } catch (error) {
      console.error('❌ Error in AI document filling:', error);
      throw new BadRequestException(`Error procesando el documento con IA: ${error.message}`);
    }
  }

  private getSystemPrompt(documentType: string): string {
    const basePrompt = `Eres un asistente especializado en documentos legales chilenos. Tu tarea es completar plantillas de documentos legales utilizando información extraída de archivos proporcionados por el usuario.`;
    
    switch (documentType) {
      case 'contrato-compraventa-final':
        return `${basePrompt}

ESPECIALIZACIÓN: Contratos de Compraventa Inmobiliaria
- Busca información sobre propiedades, precios, partes involucradas, direcciones
- Identifica datos como nombres, RUTs, domicilios, valores, formas de pago
- Presta atención a fechas, inscripciones en el CBR, roles de avalúo
- Mantén la formalidad legal del lenguaje`;

      case 'estudio-caso-compraventa':
        return `${basePrompt}

ESPECIALIZACIÓN: Estudios de Caso Inmobiliarios
- Analiza documentos para extraer información relevante para el análisis legal
- Busca datos sobre titularidad, gravámenes, precios, financiamiento
- Identifica riesgos legales o financieros mencionados
- Extrae información técnica como superficies, inscripciones, avalúos`;

      case 'contrato-arrendamiento':
        return `${basePrompt}

ESPECIALIZACIÓN: Contratos de Arrendamiento
- Busca información sobre propiedades en alquiler, cánones, plazos
- Identifica arrendadores, arrendatarios, garantías
- Extrae condiciones especiales, servicios incluidos, depósitos`;

      case 'poder-notarial':
        return `${basePrompt}

ESPECIALIZACIÓN: Poderes Notariales
- Busca información sobre mandantes, mandatarios, facultades específicas
- Identifica el propósito del poder y las limitaciones
- Extrae plazos de vigencia y condiciones especiales`;

      default:
        return `${basePrompt}

ESPECIALIZACIÓN: Documentos Legales Generales
- Analiza el contenido para identificar información relevante para el tipo de documento
- Mantén la precisión legal y la formalidad del lenguaje
- Busca datos como nombres, fechas, montos, condiciones específicas`;
    }
  }
}