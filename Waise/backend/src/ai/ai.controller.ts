import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';

interface FillDocumentRequest {
  documentTemplate: string;
  filesContent: Array<{
    filename: string;
    path: string;
    content: string;
    type: string;
  }>;
  documentType: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('fill-document')
  @UseGuards(AuthGuard('jwt'))
  async fillDocument(
    @Body() request: FillDocumentRequest,
    @Req() req: any
  ) {
    console.log('🤖 AI Fill Document called');
    console.log('Document type:', request.documentType);
    console.log('Files count:', request.filesContent.length);
    
    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    return await this.aiService.fillDocument(
      request.documentTemplate,
      request.filesContent,
      request.documentType,
      userId
    );
  }
}