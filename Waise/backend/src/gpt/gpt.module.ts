



// import { Module } from '@nestjs/common';
// import { GptService } from './gpt.service';
// import { GptController } from './gpt.controller';
// import { AuthModule } from '../auth/auth.module';

// @Module({
//   imports: [AuthModule],
//   controllers: [GptController],
//   providers: [GptService],
// })
// export class GptModule {}



import { Module } from '@nestjs/common';
import { GptService } from './gpt.service';
import { GptController } from './gpt.controller';
// import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../messages/message.entity';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [
    // AuthModule,
    TypeOrmModule.forFeature([Message]),
    VectorModule
  ],
  controllers: [GptController],
  providers: [GptService],
})
export class GptModule {}