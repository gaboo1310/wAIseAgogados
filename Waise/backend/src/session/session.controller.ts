import { Controller, Post, Delete, UseGuards, UnauthorizedException, Req, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from './session.service';
import { RequestWithUser } from '../auth/interfaces/request-with-user';

@Controller('session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createSession(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.error('User ID not found in request');
      throw new UnauthorizedException('User ID not found');
    }
    //this.logger.log(`Creating session for user: ${userId}`);
    const session = await this.sessionService.createSession(userId);
    //this.logger.log(`Session created successfully for user: ${userId}`);
    return {
      sessionToken: session.sessionToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
    };
  }

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateSession(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.error('User ID not found in request');
      throw new UnauthorizedException('User ID not found');
    }
    //this.logger.log(`Validating session for user: ${userId}`);
    const session = await this.sessionService.validateSession(userId);
    //this.logger.log(`Session validated successfully for user: ${userId}`);
    return {
      sessionToken: session.sessionToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
    };
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  async deleteSession(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.error('User ID not found in request');
      throw new UnauthorizedException('User ID not found');
    }
    //this.logger.log(`Deleting sessions for user: ${userId}`);
    await this.sessionService.deleteSession(userId);
    this.logger.log(`Sessions deleted successfully for user: ${userId}`);
    return { success: true };
  }
} 