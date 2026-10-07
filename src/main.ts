import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@/modules/app.module';
import { initDatabase } from './resources/database/main';
import requestLoggingPlugin from './resources/plugins/request-logging.plugin';
import scannerBlockPlugin from './resources/plugins/scanner-block.plugin';
import { GlobalExceptionFilter } from './resources/middleware/exception.middleware';
import type { FastifyRequest, FastifyReply } from 'fastify';

async function bootstrap() {
  await initDatabase();

  const isDev = process.env.NODE_ENV !== 'production';
  const logLevels: any[] = isDev
    ? ['verbose', 'debug', 'log', 'warn', 'error']
    : ['log', 'warn', 'error'];

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: isDev }),
    { logger: logLevels },
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS 허용 오리진은 반드시 환경변수(CORS_ORIGINS)로 주입한다. 도메인 하드코딩 금지.
  // 미지정 시 로컬 개발 오리진만 허용한다.
  const envOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin:
      envOrigins && envOrigins.length > 0
        ? envOrigins
        : ['http://localhost:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const fastifyInstance = app.getHttpAdapter().getInstance();

  // 취약점 스캐너/봇 차단 (라우팅 이전에 등록)
  scannerBlockPlugin.register(fastifyInstance as any);

  // 요청 시작 시각 기록 + 응답 시 요청 로깅
  fastifyInstance.addHook('onRequest', async (req: FastifyRequest) => {
    (req as any)._startTime = Date.now();
  });
  fastifyInstance.addHook(
    'onSend',
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
    ) => {
      await requestLoggingPlugin.log(request, reply, payload);
      return payload;
    },
  );

  await app.listen({
    port: Number(process.env.SERVICE_PORT) || 3001,
    host: '0.0.0.0',
  });
  console.log(`🚀 API Server is running on: ${await app.getUrl()}`);
}

bootstrap();
