import { randomUUID } from 'node:crypto';

interface AuthCodeData {
  user_uuid: string;
  email: string | null;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  nonce?: string;
  expires_at: number;
}

export const authorizationCodes = new Map<string, AuthCodeData>();

export function generateCode(data: Omit<AuthCodeData, 'expires_at'>): string {
  const code = randomUUID();
  authorizationCodes.set(code, { ...data, expires_at: Date.now() + 60_000 });
  return code;
}

export function consumeCode(code: string): AuthCodeData | null {
  const data = authorizationCodes.get(code);
  if (!data) return null;
  authorizationCodes.delete(code);
  if (data.expires_at < Date.now()) return null;
  return data;
}
