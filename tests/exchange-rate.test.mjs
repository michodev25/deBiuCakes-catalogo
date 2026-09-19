import test from 'node:test';
import assert from 'node:assert/strict';
import exchangeRateApi from '../api/exchange-rate.mjs';
import { extractUsdCup, readExchangeRate } from '../lib/exchange-rate.mjs';

test('USD rate is read from common elTOQUE-shaped payloads without confusing other currencies', () => {
  assert.equal(extractUsdCup({ data: { rates: { EUR: 780, USD: 710 } } }), 710);
  assert.equal(extractUsdCup({ tasas: [{ currency: 'EUR', median: 780 }, { currency: 'USD', median: 710 }] }), 710);
  assert.throws(() => extractUsdCup({ data: { EUR: 780 } }), /formato/);
});

test('without a token, the endpoint returns a clearly stale dated reference', async () => {
  const previous = process.env.ELTOQUE_API_TOKEN;
  delete process.env.ELTOQUE_API_TOKEN;
  try {
    const response = await exchangeRateApi.fetch(new Request('https://cakes.example/api/exchange-rate'));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { usdCup: 710, source: 'reference', observedAt: '2026-09-19', stale: true });
    const rejected = await exchangeRateApi.fetch(new Request('https://cakes.example/api/exchange-rate', { method: 'POST' }));
    assert.equal(rejected.status, 405);
  } finally {
    if (previous === undefined) delete process.env.ELTOQUE_API_TOKEN;
    else process.env.ELTOQUE_API_TOKEN = previous;
  }
});

test('with a token, the server sends Bearer authorization and caches the rate', async () => {
  const previous = process.env.ELTOQUE_API_TOKEN;
  process.env.ELTOQUE_API_TOKEN = 'test-private-token';
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'https://tasas.eltoque.com/v1/trmi');
    assert.equal(options.headers.Authorization, 'Bearer test-private-token');
    return Response.json({ data: { USD: { median: 725 } } });
  };
  try {
    const now = Date.UTC(2026, 8, 19, 12);
    const result = await readExchangeRate({ fetchImpl, now });
    assert.deepEqual(result, { usdCup: 725, source: 'eltoque', observedAt: new Date(now).toISOString(), stale: false });
    assert.deepEqual(await readExchangeRate({ fetchImpl, now: now + 60_000 }), result);
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.ELTOQUE_API_TOKEN;
    else process.env.ELTOQUE_API_TOKEN = previous;
  }
});
