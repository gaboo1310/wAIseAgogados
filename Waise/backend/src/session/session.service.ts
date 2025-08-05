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
    try {
      // Verificar si ya existe una sesión válida para evitar concurrencia
      const existingSession = await this.sessionRepository.findOne({
        where: { userId, isValid: true },
        order: { createdAt: 'DESC' }
      });

      if (existingSession) {
        // Actualizar sesión existente
        const newExpiresAt = new Date(Date.now() + this.SESSION_TTL);
        await this.sessionRepository.update(existingSession.id, { 
          expiresAt: newExpiresAt,
          sessionToken: uuidv4() // Generar nuevo token
        });
        return { ...existingSession, expiresAt: newExpiresAt };
      }

      // Eliminar sesiones anteriores antes de crear nueva
      await this.sessionRepository.delete({ userId });

      // Crear nueva sesión
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + this.SESSION_TTL);

      const session = this.sessionRepository.create({
        userId,
        sessionToken,
        expiresAt,
        isValid: true
      });

      const savedSession = await this.sessionRepository.save(session);
      return savedSession;
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
        // Don't log warning for missing sessions - this is expected on first login
        throw new UnauthorizedException('No valid session found');
      }

      // Actualiza expiración usando update para evitar insertar duplicados
      const newExpiresAt = new Date(Date.now() + this.SESSION_TTL);
      await this.sessionRepository.update(session.id, { expiresAt: newExpiresAt });
      session.expiresAt = newExpiresAt;

      //console.log(`[SessionService] Session validated for userId: ${userId}`);
      return session;
    } catch (error) {
      // Don't log session validation errors - they're expected during normal flow
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[SessionService] Unexpected error validating session:', error);
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