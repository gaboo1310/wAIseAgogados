import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VectorService } from './vector.service';
import { extractUserId } from '../common/auth.helper';

interface RequestWithUser extends Request {
  user: {
    sub?: string;
    userId: string;
    [key: string]: any;
  };
}

interface SearchQuery {
  query: string;
  topK?: number;
  documentType?: string;
  documentIds?: string[];
}

@Controller('vector')
@UseGuards(AuthGuard('jwt'))
export class VectorController {
  constructor(private readonly vectorService: VectorService) {}

  @Get('test')
  async testConnection() {
    const result = await this.vectorService.testConnection();
    return result;
  }

  @Post('search')
  async searchSimilarDocuments(
    @Body() searchQuery: SearchQuery,
    @Req() req: RequestWithUser,
  ) {
    if (!searchQuery.query || searchQuery.query.trim().length < 2) {
      throw new BadRequestException('Query must be at least 2 characters long');
    }

    const userId = extractUserId(req.user);
    const { query, topK = 10, documentType, documentIds } = searchQuery;

    const results = await this.vectorService.searchSimilarDocuments(
      query,
      userId,
      topK,
      { documentType, documentIds }
    );

    return {
      success: true,
      query,
      results,
      totalFound: results.length,
    };
  }

  @Get('search')
  async searchSimilarDocumentsGet(
    @Query('q') query: string,
    @Query('topK') topK: string = '10',
    @Query('documentType') documentType: string,
    @Req() req: RequestWithUser,
  ) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Query parameter "q" must be at least 2 characters long');
    }

    const userId = extractUserId(req.user);
    const results = await this.vectorService.searchSimilarDocuments(
      query,
      userId,
      parseInt(topK, 10),
      { documentType }
    );

    return {
      success: true,
      query,
      results,
      totalFound: results.length,
    };
  }
}