import type { FastifyRequest } from 'fastify';

// 우선순위: cf-connecting-ip → x-forwarded-for(첫 항목) → request.ip → 'unknown'
export function getClientIp(_request: FastifyRequest): string {
  const cfIp = _request.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.length > 0) return cfIp.trim();

  const xff = _request.headers['x-forwarded-for'];
  const xffStr = Array.isArray(xff) ? xff[0] : xff;
  if (typeof xffStr === 'string' && xffStr.length > 0) {
    const first = xffStr.split(',')[0]?.trim();
    if (first) return first;
  }
  if (_request.ip) return _request.ip;
  return 'unknown';
}
