import { randomUUID } from 'node:crypto';
import jwtPlugin from '@/resources/plugins/jwt.plugin';
import { prisma } from '@/resources/database/main';
import type { SessionContext } from '@/resources/plugins/location.plugin';

interface IssueInput {
  user_uuid: string;
  email: string | null;
  session: SessionContext;
}

// RefreshToken 행의 uuid 를 access/refresh JWT 의 sid 클레임에 심어 "현재 세션"을 식별한다.
export async function issueTokens(_input: IssueInput) {
  const sessionUuid = randomUUID();
  const payload = {
    uuid: _input.user_uuid,
    email: _input.email,
    sid: sessionUuid,
  };

  const accessToken = jwtPlugin.encode(payload);
  const refreshToken = jwtPlugin.encodeRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      uuid: sessionUuid,
      user_uuid: _input.user_uuid,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip: _input.session.ip,
      user_agent: _input.session.user_agent,
      loc_country: _input.session.loc_country,
      loc_region: _input.session.loc_region,
      loc_city: _input.session.loc_city,
      last_seen_at: new Date(),
    },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
  };
}
