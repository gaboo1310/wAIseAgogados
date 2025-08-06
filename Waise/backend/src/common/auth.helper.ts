import { UnauthorizedException } from '@nestjs/common';

export function extractUserId(user: any): string {
  const userId = user?.userId || user?.sub;
  if (!userId) {
    throw new UnauthorizedException('User ID not found in token');
  }
  return userId;
}