import { Controller, Post, Delete, UseGuards, UnauthorizedException, Req, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from './session.service';
import { RequestWithUser } from '../auth/interfaces/request-with-user';

@Controller('session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);
  private readonly creationLocks = new Map<string, Promise<any>>();

  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createSession(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.error('User ID not found in request');
      throw new UnauthorizedException('User ID not found');
    }

    // Usar lock para prevenir creación de sesiones concurrentes
    if (this.creationLocks.has(userId)) {
      return await this.creationLocks.get(userId);
    }

    const sessionPromise = this.sessionService.createSession(userId).then(session => {
      this.creationLocks.delete(userId);
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expiresAt: session.expiresAt,
      };
    }).catch(error => {
      this.creationLocks.delete(userId);
      throw error;
    });

    this.creationLocks.set(userId, sessionPromise);
    return await sessionPromise;
  }

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateSession(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.error('User ID not found in request');
      throw new UnauthorizedException('User ID not found');
    }
    try {
      const session = await this.sessionService.validateSession(userId);
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      // Don't log session validation errors - they're expected on first login
      throw error;
    }
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