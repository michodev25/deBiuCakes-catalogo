import { readExchangeRate } from '../lib/exchange-rate.mjs';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return Response.json({ error: 'Método no permitido.' }, { status: 405, headers: { Allow: 'GET' } });
    return Response.json(await readExchangeRate(), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600' }
    });
  }
};
