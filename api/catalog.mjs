import { getSession, json, readJson, sameOrigin } from '../lib/admin-auth.mjs';
import { readCatalog, writeCatalog } from '../lib/catalog-store.mjs';

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      try { return json(await readCatalog()); }
      catch (error) { return json({ error: error.message }, 502); }
    }
    if (request.method !== 'PUT') return json({ error: 'Método no permitido.' }, 405, { Allow: 'GET, PUT' });
    const username = getSession(request);
    if (!username) return json({ error: 'Inicia sesión para guardar.' }, 401);
    if (!sameOrigin(request)) return json({ error: 'Origen no permitido.' }, 403);
    try {
      const body = await readJson(request, 500_000);
      if (typeof body.sha !== 'string' || !body.sha) return json({ error: 'Falta la versión del catálogo. Recarga el panel.' }, 400);
      const result = await writeCatalog(body.catalog, body.sha, username);
      if (result.conflict) return json({ error: 'El catálogo cambió en otra sesión. Recarga antes de guardar.' }, 409);
      return json(result);
    } catch (error) {
      return json({ error: error.message }, /no es válido|no válida|repetid|no existe|Revisa|debe|permitid|supera/.test(error.message) ? 400 : 502);
    }
  }
};
