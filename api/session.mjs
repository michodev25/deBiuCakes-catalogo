import { configured, createSession, getSession, json, readJson, sameOrigin, sessionCookie, validCredentials } from '../lib/admin-auth.mjs';

export default {
  async fetch(request) {
    if (request.method === 'GET') return json({ username: getSession(request), configured: configured() });
    if (!['POST', 'DELETE'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405, { Allow: 'GET, POST, DELETE' });
    if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
    if (request.method === 'DELETE') return json({ username: null }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
    if (!configured()) return json({ error: 'El acceso de administradores aún no está configurado en Vercel.' }, 503);
    try {
      const body = await readJson(request, 2048);
      const username = String(body.username || '').trim().toLocaleLowerCase('es');
      if (!validCredentials(username, body.password)) return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
      return json({ username }, 200, { 'Set-Cookie': sessionCookie(request, createSession(username)) });
    } catch {
      return json({ error: 'Solicitud no válida.' }, 400);
    }
  }
};
