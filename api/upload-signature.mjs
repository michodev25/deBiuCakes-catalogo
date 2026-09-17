import { createHash } from 'node:crypto';
import { getSession, json, sameOrigin } from '../lib/admin-auth.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, { Allow: 'POST' });
    if (!getSession(request)) return json({ error: 'Inicia sesión para subir fotos.' }, 401);
    if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
    if (!cloudName || !apiKey || !secret) return json({ error: 'Cloudinary aún no está configurado en Vercel.' }, 503);
    const folder = 'labiu-cakes/products';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
    return json({ cloudName, apiKey, folder, timestamp, signature });
  }
};
