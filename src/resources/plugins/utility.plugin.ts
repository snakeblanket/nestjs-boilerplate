import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import * as gitManager from 'git-rev-sync';

const _logger = new Logger('UtilityPlugin');
const _privateKey = fs.readFileSync(
  path.resolve(process.cwd(), 'src/resources/keys/private.pem'),
  'utf8',
);
const _publicKey = fs.readFileSync(
  path.resolve(process.cwd(), 'src/resources/keys/public.pem'),
  'utf8',
);

export default {
  getRandomStrings: (
    _length = 16,
    _charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  ): string =>
    Array.from({ length: _length }, () =>
      _charset.charAt(Math.floor(Math.random() * _charset.length)),
    ).join(''),

  isUUID: (_c: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(_c),
  isEmailAddress: (_e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_e),
  isUrl: (_s: string): boolean => {
    try {
      const _u = new URL(_s);
      return _u.protocol === 'http:' || _u.protocol === 'https:';
    } catch {
      return false;
    }
  },
  toSnakeCase: (str: string) =>
    str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, ''),
  safeStringify: (_obj: any): string => {
    try {
      const _o = JSON.stringify(_obj);
      return _o === '{}' ? '' : _o;
    } catch (_error) {
      _logger.error('Error stringifying object');
      return '{}';
    }
  },
  getVersion: (): string => {
    try {
      return gitManager.short();
    } catch {
      return 'unknown';
    }
  },

  // 공통 fetch 래퍼 — 항상 { success, ... } 형태로 resolve (throw 안 함)
  request: (
    _url: string,
    _method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    _query: Record<string, any> = {},
    _headers: Record<string, any> = {},
    _body: Record<string, any> | null = null,
  ): Promise<
    | { success: true; status: number; data: any }
    | { success: false; error: Error }
  > => {
    return new Promise(async (_resolve) => {
      try {
        let _finalUrl = _url;
        if (Object.keys(_query).length > 0) {
          const _qs = new URLSearchParams(_query).toString();
          _finalUrl = `${_url}${_url.includes('?') ? '&' : '?'}${_qs}`;
        }
        const _options: RequestInit = { method: _method, headers: _headers };
        if (_body) {
          _options.body =
            typeof _body === 'object' ? JSON.stringify(_body) : (_body as any);
          if (typeof _body === 'object')
            _options.headers = {
              ..._options.headers,
              'Content-Type': 'application/json',
            };
        }
        const _response = await fetch(_finalUrl, _options);
        const _data = await _response.json();
        _resolve({ success: true, status: _response.status, data: _data });
      } catch (_error) {
        _resolve({ success: false, error: _error as Error });
      }
    });
  },

  JWT: {
    encode: (_payload: object, _expiresIn = '1h'): string =>
      jwt.sign(
        { ..._payload, iss: process.env.JWT_ISSUER || 'api' },
        _privateKey,
        { algorithm: 'RS256', expiresIn: _expiresIn as any },
      ),
    verify: (_token: string): jwt.JwtPayload | null => {
      try {
        return jwt.verify(_token, _publicKey, {
          algorithms: ['RS256'],
        }) as jwt.JwtPayload;
      } catch {
        return null;
      }
    },
    decode: (_token: string): Record<string, any> | null => {
      try {
        return jwt.decode(_token) as Record<string, any>;
      } catch {
        return null;
      }
    },
  },
};
