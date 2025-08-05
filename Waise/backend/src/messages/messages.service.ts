import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { format, toZonedTime } from 'date-fns-tz';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  // Guardar un mensaje en la base de datos
  async createMessage(text: string, isGpt: string, userId: string, conversationId: string): Promise<Message> {
    const message = this.messageRepository.create({ text, isGpt, userId, conversationId });
    return this.messageRepository.save(message);
  }

  // Obtener los mensajes de un usuario específico
  async getMessagesByUser(userId: string): Promise<Message[]> {
    const messages = await this.messageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' }, // Ordenados por fecha de creación
    });

    // Ajustar la fecha al huso horario de Chile
    const timeZone = 'America/Santiago';
    return messages.map((message) => {
      const chileTime = toZonedTime(message.createdAt, timeZone);
      message.createdAt = new Date(chileTime.toISOString());
      return message;
    });
  }

  // Método para obtener solo la primera pregunta de cada conversación
  async getChatHistory(userId: string): Promise<Message[]> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.userId = :userId', { userId })
      .andWhere('message.isGpt = :isGpt', { isGpt: 'false' })
      .distinctOn(['message.conversationId'])
      .orderBy('message.conversationId', 'ASC')
      .addOrderBy('message.createdAt', 'ASC')
      .getMany();

    // Ajustar la fecha al huso horario de Chile
    const timeZone = 'America/Santiago';
    return messages.map((message) => {
      const chileTime = toZonedTime(message.createdAt, timeZone);
      message.createdAt = new Date(chileTime.toISOString());
      return message;
    });
  }
}