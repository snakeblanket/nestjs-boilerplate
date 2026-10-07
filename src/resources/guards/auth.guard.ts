import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import jwtPlugin from '@/resources/plugins/jwt.plugin';
import { prisma } from '@/resources/database/main';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const _request = _context.switchToHttp().getRequest<FastifyRequest>();
    const _authorization = _request.headers.authorization;

    if (!_authorization || !_authorization.startsWith('Bearer ')) {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _token = _authorization.slice(7);
    const _payload = jwtPlugin.verify(_token);

    if (!_payload || _payload.type === 'refresh') {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const _user = await prisma.user.findUnique({
      where: { uuid: _payload.uuid, is_active: true },
    });
    if (!_user) {
      throw new HttpException(
        '유효하지 않거나 만료된 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    (_request as any).user = _user;
    (_request as any).session_id =
      typeof _payload.sid === 'string' ? _payload.sid : null;
    return true;
  }
}
