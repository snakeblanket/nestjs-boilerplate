import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '@nestjs/common';
import { prisma } from '@/resources/database/main';
import { RequestMethod } from '@/resources/constants/http-method.enum';
import { getClientIp } from '@/resources/plugins/client-ip.plugin';

const _logger = new Logger('RequestLoggingPlugin');

class RequestLoggingPlugin {
  async log(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: any,
  ): Promise<void> {
    try {
      const statusCode = reply.statusCode;
      const clientIp = getClientIp(request);
      const startTime = (request as any)._startTime || Date.now();
      const duration = Date.now() - startTime;

      _logger.log(
        `${request.method} ${request.url} → ${statusCode} (${duration}ms, IP: ${clientIp})`,
      );

      const method = (request.method?.toUpperCase() ||
        'GET') as RequestMethod;
      const rawUa = request.headers['user-agent'] || '';

      let responseBody: any = null;
      if (payload) {
        try {
          responseBody =
            typeof payload === 'string' ? JSON.parse(payload) : payload;
        } catch {
          responseBody = null;
        }
      }

      await prisma.request.create({
        data: {
          ip: clientIp,
          user_agent: { raw: rawUa },
          method,
          host: request.hostname || null,
          url: request.url || null,
          body:
            request.method !== 'GET' ? (request.body as any) || null : null,
          query:
            Object.keys((request.query as any) || {}).length > 0
              ? (request.query as any)
              : null,
          status: statusCode,
          duration,
          response_body: responseBody,
        },
      });
    } catch (error) {
      _logger.error('Request logging failed:', error);
    }
  }
}

export default new RequestLoggingPlugin();
