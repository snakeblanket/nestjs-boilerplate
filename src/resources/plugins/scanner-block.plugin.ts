import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Logger } from '@nestjs/common';

const _logger = new Logger('ScannerBlockPlugin');

function clientIp(request: FastifyRequest): string {
  const cf = request.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.length > 0) return cf.trim();
  const xff = request.headers['x-forwarded-for'];
  const xffStr = Array.isArray(xff) ? xff[0] : xff;
  if (typeof xffStr === 'string' && xffStr.length > 0) {
    const first = xffStr.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.ip || 'unknown';
}

const SCANNER_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\.[\w-]+)*$/i,
  /(^|\/)[\w.-]+\.env(\.[\w-]+)*$/i,
  /(^|\/)\.(git|svn|hg|bzr)(\/|$)/i,
  /(^|\/)\.(aws|ssh|docker|kube|vscode|idea)(\/|$)/i,
  /(^|\/)\.(htaccess|htpasswd|ds_store|npmrc|dockercfg|netrc)$/i,
  /(^|\/)(credentials?|secrets?|id_rsa|id_dsa)(\.[\w-]+)?$/i,
  /\.(sql|sqlite|db|bak|backup|old|swp|dump)(\.[\w-]+)?$/i,
  /\.(zip|tar|tgz|gz|rar|7z)$/i,
  /\.php\d?($|\?|\/)/i,
  /(^|\/)(wp-login|wp-admin|wp-content|wp-includes|xmlrpc)/i,
  /(^|\/)(phpinfo|phpunit|phpmyadmin|pma|adminer|eval-stdin)/i,
  /(^|\/)vendor\//i,
  /(^|\/)(config|configuration|settings|application)\.(json|ya?ml|xml|ini|properties)$/i,
  /(^|\/)(server-status|server-info|actuator\/env|telescope|debug)/i,
];
const ALLOWLIST_PREFIXES = ['/.well-known/'];

const THRESHOLD = Number(process.env.SCANNER_BAN_THRESHOLD) || 8;
const WINDOW_MS = Number(process.env.SCANNER_BAN_WINDOW_MS) || 60_000;
const BAN_MS = Number(process.env.SCANNER_BAN_DURATION_MS) || 3_600_000;

interface IpState {
  strikes: number;
  windowStart: number;
  bannedUntil: number;
}
const ipStates = new Map<string, IpState>();

let lastSweep = 0;
function sweep(now: number): void {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [ip, st] of ipStates) {
    if (now - st.windowStart > WINDOW_MS && st.bannedUntil < now)
      ipStates.delete(ip);
  }
}

export function isScannerPath(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0].split('#')[0];
  for (const prefix of ALLOWLIST_PREFIXES)
    if (path.toLowerCase().startsWith(prefix)) return false;
  return SCANNER_PATTERNS.some((re) => re.test(path));
}

export function isBanned(ip: string, now = Date.now()): boolean {
  const st = ipStates.get(ip);
  return !!st && st.bannedUntil > now;
}

function recordStrike(ip: string, now = Date.now()): boolean {
  const st = ipStates.get(ip) ?? {
    strikes: 0,
    windowStart: now,
    bannedUntil: 0,
  };
  if (now - st.windowStart > WINDOW_MS) {
    st.strikes = 0;
    st.windowStart = now;
  }
  st.strikes += 1;
  let newlyBanned = false;
  if (st.strikes >= THRESHOLD && st.bannedUntil <= now) {
    st.bannedUntil = now + BAN_MS;
    newlyBanned = true;
  }
  ipStates.set(ip, st);
  return newlyBanned;
}

export function _resetBans(): void {
  ipStates.clear();
  lastSweep = 0;
}

function register(fastify: FastifyInstance): void {
  if (process.env.SCANNER_BLOCK_DISABLED === 'true') {
    _logger.warn('scanner-block disabled');
    return;
  }
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const now = Date.now();
      sweep(now);
      const ip = clientIp(request);
      if (isBanned(ip, now)) {
        reply.code(403).type('application/json').send({
          success: false,
          data: null,
          error: 'Forbidden',
          requested_at: new Date().toISOString(),
        });
        return reply;
      }
      if (isScannerPath(request.url)) {
        const banned = recordStrike(ip, now);
        if (banned)
          _logger.warn(
            `IP ${ip} banned (${THRESHOLD}+ probes) — ${request.method} ${request.url}`,
          );
        reply.code(404).type('application/json').send({
          success: false,
          data: null,
          error: 'Not Found',
          requested_at: new Date().toISOString(),
        });
        return reply;
      }
    },
  );
  _logger.log(
    `scanner-block registered (threshold=${THRESHOLD}/${WINDOW_MS / 1000}s, ban=${BAN_MS / 1000}s)`,
  );
}

export default { isScannerPath, isBanned, register, _resetBans };
