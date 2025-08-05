import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validateUser(payload: any) {
    const provider = payload.sub.split('|')[0];

    return {
      userId: payload.sub, // Identificador único completo
      email: payload.email,
      provider
    };
  }
}
