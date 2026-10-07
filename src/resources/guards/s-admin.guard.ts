import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from '@/resources/guards/auth.guard';

@Injectable()
export class SAdminGuard implements CanActivate {
  private readonly _authGuard = new AuthGuard();

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    await this._authGuard.canActivate(_context);
    const _request = _context.switchToHttp().getRequest<FastifyRequest>();
    const _user = (_request as any).user;
    if (!_user || _user.role !== 'S_ADMIN') {
      throw new HttpException(
        'S_ADMIN 권한이 필요합니다.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
