import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Message } from './message.entity';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Endpoint para guardar un mensaje
  @Post()
  async createMessage(
    @Body('text') text: string,
    @Body('isGpt') isGpt: string,
    @Body('userId') userId: string,
    @Body('conversationId') conversationId: string,
  ): Promise<Message> {
    return this.messagesService.createMessage(text, isGpt, userId, conversationId);
  }

  // Endpoint para obtener el historial de mensajes de un usuario
  @Get(':userId')
  async getMessages(@Param('userId') userId: string): Promise<Message[]> {
    return this.messagesService.getMessagesByUser(userId);
  }

  // Nuevo endpoint para obtener solo la primera pregunta de cada conversación
  @Get('history/:userId')
  async getChatHistory(@Param('userId') userId: string): Promise<Message[]> {
    return this.messagesService.getChatHistory(userId);
  }
}