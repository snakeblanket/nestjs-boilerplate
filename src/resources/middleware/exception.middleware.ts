import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

const _logger = new Logger('GlobalExceptionFilter');

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  async catch(_exception: unknown, _host: ArgumentsHost) {
    const _ctx = _host.switchToHttp();
    const _request = _ctx.getRequest<
      FastifyRequest & { _startTime?: number }
    >();
    const _response = _ctx.getResponse<FastifyReply>();
    const _statusCode =
      _exception instanceof HttpException
        ? _exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let _message: string | string[] = 'Internal server error';

    if (_exception instanceof HttpException) {
      const _res = _exception.getResponse();
      _message =
        typeof _res === 'string'
          ? _res
          : typeof _res === 'object' && 'message' in _res
            ? (_res.message as any)
            : _exception.message;
    } else if (_exception instanceof Error) {
      _message = _exception.message;
    }

    if (_statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      _logger.error(
        `${_request.method} ${_request.url} → ${_statusCode}`,
        _exception instanceof Error ? _exception.stack : undefined,
      );
    }

    return _response.status(_statusCode).send({
      success: false,
      error: Array.isArray(_message) ? _message : [_message],
      data: null,
      requested_at: new Date().toISOString(),
    });
  }
}
