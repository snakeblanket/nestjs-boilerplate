import { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    _startTime?: number;
    session_id?: string | null;
    user?: {
      uuid: string;
      username: string | null;
      name: string;
      email: string | null;
      role: string;
      is_active: boolean;
      created_at: Date;
    };
  }
}
