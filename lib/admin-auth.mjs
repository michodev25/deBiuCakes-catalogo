import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'cakeadmin_session';
const SESSION_SECONDS = 12 * 60 * 60;
const users = {
  michel: 'CAKEADMIN_MICHEL_PASSWORD',
  zahira: 'CAKEADMIN_ZAHIRA_PASSWORD'
};

export function configured() {
  return Boolean(process.env.CAKEADMIN_MICHEL_PASSWORD && process.env.CAKEADMIN_ZAHIRA_PASSWORD && process.env.CAKEADMIN_SESSION_SECRET?.length >= 32);
}

function equalSecrets(first, second) {
  const a = createHash('sha256').update(first).digest();
  const b = createHash('sha256').update(second).digest();
  return timingSafeEqual(a, b);
}

function sign(value) {
  return createHmac('sha256', process.env.CAKEADMIN_SESSION_SECRET).update(value).digest('base64url');
}

export function createSession(username) {
  const payload = Buffer.from(JSON.stringify({ username, expires: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function getSession(request) {
  if (!configured()) return null;
  const cookie = request.headers.get('cookie') || '';
  const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra || !equalSecrets(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Object.hasOwn(users, parsed.username) || !Number.isFinite(parsed.expires) || parsed.expires <= Date.now()) return null;
    return parsed.username;
  } catch {
    return null;
  }
}

export function validCredentials(username, password) {
  if (!configured() || !Object.hasOwn(users, username) || typeof password !== 'string') return false;
  return equalSecrets(password, process.env[users[username]]);
}

export function sessionCookie(request, token, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export async function readJson(request, maxBytes = 100_000) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error('El contenido supera el tamaño permitido.');
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new Error('El contenido supera el tamaño permitido.');
  return JSON.parse(text);
}
