import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('인증이 필요합니다');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { is_premium: true },
    });

    if (!user?.is_premium) {
      throw new ForbiddenException('프리미엄 구독이 필요합니다');
    }

    return true;
  }
}
