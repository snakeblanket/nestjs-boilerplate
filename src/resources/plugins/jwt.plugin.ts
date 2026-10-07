import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { pem2jwk } from 'pem-jwk';

const _logger = new Logger('JwtPlugin');
const _privateKey = fs.readFileSync(
  path.resolve(process.cwd(), 'src/resources/keys/private.pem'),
  'utf8',
);
const _publicKey = fs.readFileSync(
  path.resolve(process.cwd(), 'src/resources/keys/public.pem'),
  'utf8',
);

// kid: public key SHA-256 앞 16바이트 hex (JWKS / JWT 헤더 공통)
const _kid = createHash('sha256').update(_publicKey).digest('hex').slice(0, 32);

const _publicJwk = (() => {
  const _jwk = pem2jwk(_publicKey);
  return { ..._jwk, kid: _kid, alg: 'RS256', use: 'sig' };
})();

export default {
  encode: (_payload: object, _expiresIn: string = '1h'): string =>
    jwt.sign(
      { ..._payload, iss: process.env.JWT_ISSUER || 'api' },
      _privateKey,
      { algorithm: 'RS256', keyid: _kid, expiresIn: _expiresIn as any },
    ),

  encodeRefreshToken: (_payload: object, _expiresIn: string = '30d'): string =>
    jwt.sign(
      { ..._payload, iss: process.env.JWT_ISSUER || 'api', type: 'refresh' },
      _privateKey,
      { algorithm: 'RS256', keyid: _kid, expiresIn: _expiresIn as any },
    ),

  verify: (_token: string): jwt.JwtPayload | null => {
    try {
      return jwt.verify(_token, _publicKey, {
        algorithms: ['RS256'],
      }) as jwt.JwtPayload;
    } catch (_error) {
      return null;
    }
  },

  decode: (_token: string): Record<string, any> | null => {
    try {
      return jwt.decode(_token) as Record<string, any>;
    } catch (_error) {
      return null;
    }
  },

  getPublicJwk: () => _publicJwk,
  getKid: () => _kid,
  getPublicKeyPem: () => _publicKey,
};
