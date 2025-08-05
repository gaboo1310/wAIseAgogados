import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GptModule } from './gpt/gpt.module';
import { MessagesModule } from './messages/messages.module';
import { Message } from './messages/message.entity';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { DocumentsModule } from './documents/documents.module';
import { UploadsModule } from './uploads/uploads.module';
import { Session } from './session/session.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'chat_db',
      entities: [Message, Session],
      synchronize: true, // Solo en desarrollo, NO en producción
    }),
    MessagesModule,
    GptModule,
    AuthModule,
    SessionModule,
    DocumentsModule,
    UploadsModule
  ],
})
export class AppModule {}
