import type { FastifyRequest } from 'fastify';
import { getClientIp } from '@/resources/plugins/client-ip.plugin';

export interface SessionContext {
  ip: string;
  user_agent: string | null;
  loc_country: string | null;
  loc_region: string | null;
  loc_city: string | null;
}

// 요청에서 세션 컨텍스트(IP/UA/위치)를 추출한다.
// 위치 조회는 외부 서비스 연동 시 환경변수로 엔드포인트/키를 주입하고 여기서 채운다.
export function getSessionContext(_request: FastifyRequest): SessionContext {
  const _ua = _request.headers['user-agent'];
  return {
    ip: getClientIp(_request),
    user_agent: typeof _ua === 'string' ? _ua : null,
    loc_country: null,
    loc_region: null,
    loc_city: null,
  };
}
