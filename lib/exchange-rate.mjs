const SOURCE_URL = 'https://tasas.eltoque.com/v1/trmi';
const CACHE_MS = 10 * 60 * 1000;

export const REFERENCE_RATE = Object.freeze({
  usdCup: 710,
  source: 'reference',
  observedAt: '2026-09-19',
  stale: true
});

let cachedRate = null;
let cacheUntil = 0;

function numericRate(value) {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && number > 0 && number < 1_000_000 ? number : null;
}

function rateValue(value) {
  const direct = numericRate(value);
  if (direct !== null) return direct;
  if (!value || typeof value !== 'object') return null;
  for (const field of ['median', 'mediana', 'rate', 'valor', 'value', 'tasa']) {
    const found = numericRate(value[field]);
    if (found !== null) return found;
  }
  return null;
}

export function extractUsdCup(payload) {
  const visited = new Set();
  function search(value, depth) {
    if (!value || typeof value !== 'object' || depth > 4 || visited.has(value)) return null;
    visited.add(value);
    for (const key of ['USD', 'usd']) {
      const found = rateValue(value[key]);
      if (found !== null) return found;
    }
    if (Array.isArray(value)) {
      for (const row of value) {
        if (row && ['USD', 'usd'].includes(row.currency || row.moneda || row.code || row.codigo)) {
          const found = rateValue(row);
          if (found !== null) return found;
        }
      }
    }
    for (const key of ['data', 'rates', 'tasas', 'trmi', 'result', 'results']) {
      const found = search(value[key], depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  const rate = search(payload, 0);
  if (rate === null) throw new Error('La API de elTOQUE devolvió un formato de tasa desconocido.');
  return rate;
}

export async function readExchangeRate({ fetchImpl = fetch, now = Date.now() } = {}) {
  const token = process.env.ELTOQUE_API_TOKEN;
  if (!token) return { ...REFERENCE_RATE };
  if (cachedRate && now < cacheUntil) return { ...cachedRate };
  try {
    const response = await fetchImpl(SOURCE_URL, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`elTOQUE respondió ${response.status}.`);
    const usdCup = extractUsdCup(await response.json());
    cachedRate = { usdCup, source: 'eltoque', observedAt: new Date(now).toISOString(), stale: false };
    cacheUntil = now + CACHE_MS;
    return { ...cachedRate };
  } catch {
    return cachedRate ? { ...cachedRate, stale: true } : { ...REFERENCE_RATE };
  }
}
