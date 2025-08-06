import { Body, Controller, HttpStatus, Post, Res, Get, Param, UseGuards, Req } from '@nestjs/common';
import { GptService } from './gpt.service';
import { ProsConsDiscusserDto, ChatRequestDto } from './dtos';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { extractUserId } from '../common/auth.helper';

interface JwtPayload {
  sub?: string;
  userId: string;
  providerId: string;
  email: string;
  roles: string[];
  [key: string]: any;
}

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}



  //  ----------------------------------------------------
  
//---------------------------------------------------------------------------
@Post('pros-cons-discusser-stream')
@UseGuards(AuthGuard('jwt'))
async prosConsDicusserStream(
  @Body() prosConsDiscusserDto: ProsConsDiscusserDto,
  @Res() res: Response,
  @Req() req: RequestWithUser
) {
  try {
    const userId = extractUserId(req.user);
    // Obtener el stream directamente del servicio
    const stream = await this.gptService.prosConsDicusserStream(prosConsDiscusserDto, userId);

    // Configurar las cabeceras para streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Este método sí está disponible

    // Procesar el stream de OpenAI y enviarlo al cliente
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
        // No usamos res.flush() ya que no está disponible en la interfaz estándar
      }
    }

    // Finalizar la respuesta
    res.end();
  } catch (error) {
    console.error('Error procesando el stream:', error);
    // Si aún no se ha enviado una respuesta
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error procesando el stream' });
    } else {
      res.end();
    }
  }
}

@Post('chat-stream')
@UseGuards(AuthGuard('jwt'))
async chatStream(
  @Body() chatRequest: ProsConsDiscusserDto,
  @Res() res: Response,
  @Req() req: RequestWithUser
) {
  try {
    // Log chat request for debugging
    console.log('[CONTROLLER] Chat request received:', JSON.stringify(chatRequest));
    
    const userId = extractUserId(req.user);
    // Get stream from service
    const stream = await this.gptService.prosConsDicusserStream(chatRequest, userId);

    // Configurar las cabeceras para streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Este método sí está disponible

    // Procesar el stream de OpenAI y enviarlo al cliente
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
        // No usamos res.flush() ya que no está disponible en la interfaz estándar
      }
    }

    // Finalizar la respuesta
    res.end();
  } catch (error) {
    console.error('Error procesando el stream:', error);
    // Si aún no se ha enviado una respuesta
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error procesando el stream' });
    } else {
      res.end();
    }
  }
}






  //---------------------------------------------------------------------
  @Post('ai-chat-stream')
  @UseGuards(AuthGuard('jwt'))
  async aiChatStream(
    @Body() chatRequest: ChatRequestDto,
    @Res() res: Response
  ) {
    try {
      console.log('[CONTROLLER] AI Chat stream request:', chatRequest.prompt);
      
      // Get stream from service
      const stream = await this.gptService.deepseekstreamStream(chatRequest);

      // Configurar las cabeceras para streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Procesar el stream y enviarlo al cliente
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (error) {
      console.error('[CONTROLLER] Error in deepseek stream:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
@Get('debug')
getDebug(): string {
  return 'ok';  // Esto automáticamente devuelve HTTP 200 en NestJS
}

}
