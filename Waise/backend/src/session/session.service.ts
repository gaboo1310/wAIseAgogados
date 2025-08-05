import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  private readonly SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async createSession(userId: string) {
    //console.log(`[SessionService] createSession called for userId: ${userId}`);
    try {
      // Elimina todas las sesiones anteriores del usuario
      await this.sessionRepository.delete({ userId });

      // Crea nueva sesión
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + this.SESSION_TTL);

      const session = this.sessionRepository.create({
        userId,
        sessionToken,
        expiresAt,
        isValid: true
      });

      await this.sessionRepository.save(session);
      //console.log(`[SessionService] New session created for userId: ${userId}`);
      return session;
    } catch (error) {
      console.error('[SessionService] Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  async validateSession(userId: string) {
    //console.log(`[SessionService] validateSession called for userId: ${userId}`);
    try {
      // Busca la sesión más reciente y válida
      const session = await this.sessionRepository.findOne({
        where: { userId, isValid: true },
        order: { createdAt: 'DESC' }
      });

      if (!session) {
        console.warn(`[SessionService] No valid session found for userId: ${userId}`);
        throw new UnauthorizedException('No valid session found');
      }

      // Actualiza expiración
      session.expiresAt = new Date(Date.now() + this.SESSION_TTL);
      await this.sessionRepository.save(session);

      //console.log(`[SessionService] Session validated for userId: ${userId}`);
      return session;
    } catch (error) {
      console.error('[SessionService] Error validating session:', error);
      throw new UnauthorizedException('Session validation failed');
    }
  }

  async deleteSession(userId: string) {
    try {
      // Elimina todas las sesiones del usuario
      await this.sessionRepository.delete({ userId });
      console.log(`[SessionService] All sessions deleted for userId: ${userId}`);
      return true;
    } catch (error) {
      console.error('[SessionService] Error deleting session:', error);
      return false;
    }
  }
} 