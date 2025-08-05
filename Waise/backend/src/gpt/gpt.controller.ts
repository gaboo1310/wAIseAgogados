import { Body, Controller, HttpStatus, Post, Res, Get, Param, UseGuards, Req } from '@nestjs/common';
import { GptService } from './gpt.service';
import { ProsConsDiscusserDto } from './dtos';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
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
// @Post('pros-cons-discusser-stream')
// @UseGuards(AuthGuard('jwt'))
// async prosConsDicusserStream(
//   @Body() prosConsDiscusserDto: ProsConsDiscusserDto,
//   @Res() res: Response
// ) {
//   try {
//     // Obtener el stream directamente del servicio
//     const stream = await this.gptService.prosConsDicusserStream(prosConsDiscusserDto);

//     // Configurar las cabeceras para streaming
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders(); // Este método sí está disponible

//     // Procesar el stream de OpenAI y enviarlo al cliente
//     for await (const chunk of stream) {
//       const content = chunk.choices[0]?.delta?.content || '';
//       if (content) {
//         res.write(content);
//         // No usamos res.flush() ya que no está disponible en la interfaz estándar
//       }
//     }

//     // Finalizar la respuesta
//     res.end();
//   } catch (error) {
//     console.error('Error procesando el stream:', error);
//     // Si aún no se ha enviado una respuesta
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Error procesando el stream' });
//     } else {
//       res.end();
//     }
//   }
// }

@Post('pros-cons-discusser-stream')
@UseGuards(AuthGuard('jwt'))
async prosConsDicusserStream(
  @Body() prosConsDiscusserDto: ProsConsDiscusserDto,
  @Res() res: Response
) {
  try {
    // Log completo del DTO recibido para depuración
    console.log('[CONTROLLER] Recibido DTO COMPLETO:', JSON.stringify(prosConsDiscusserDto));
    if (prosConsDiscusserDto.selectedLibraries) {
      console.log('[CONTROLLER] selectedLibraries recibidas:');
      prosConsDiscusserDto.selectedLibraries.forEach((ruta: string) => {
        console.log(' -', ruta);
      });
    }
    
    // Obtener el stream directamente del servicio
    const stream = await this.gptService.prosConsDicusserStream(prosConsDiscusserDto);

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
  @Post('deepseek-stream')
  @UseGuards(AuthGuard('jwt'))
  deepseekstreamStream(@Body() prosConsDiscusserDto: ProsConsDiscusserDto) {
    return this.gptService.deepseekstreamStream(prosConsDiscusserDto);
  }
@Get('debug')
getDebug(): string {
  return 'ok';  // Esto automáticamente devuelve HTTP 200 en NestJS
}

}
