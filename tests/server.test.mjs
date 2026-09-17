import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sessionApi from '../api/session.mjs';
import catalogApi from '../api/catalog.mjs';
import signatureApi from '../api/upload-signature.mjs';
import { validateCatalog } from '../lib/catalog-store.mjs';

const seed = JSON.parse(readFileSync(new URL('../dist/catalog.json', import.meta.url), 'utf8'));
const origin = 'https://cakes.example';
const variables = [
  'CAKEADMIN_MICHEL_PASSWORD',
  'CAKEADMIN_ZAHIRA_PASSWORD',
  'CAKEADMIN_SESSION_SECRET',
  'GITHUB_TOKEN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];
const original = Object.fromEntries(variables.map((key) => [key, process.env[key]]));

function setTestEnvironment() {
  process.env.CAKEADMIN_MICHEL_PASSWORD = 'temporary-michel-secret';
  process.env.CAKEADMIN_ZAHIRA_PASSWORD = 'temporary-zahira-secret';
  process.env.CAKEADMIN_SESSION_SECRET = 'a-long-random-test-only-session-secret-123';
  delete process.env.GITHUB_TOKEN;
}

test.after(() => {
  for (const key of variables) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test('the initial JSON and category links are valid', () => {
  const result = validateCatalog(seed);
  assert.equal(result.products.length, 8);
  assert.equal(result.categories.length, 4);
});

test('catalog validation rejects duplicated categories and unsafe image URLs', () => {
  assert.throws(() => validateCatalog({ ...seed, categories: ['Cakes', 'cakes'] }), /repetidas/);
  const bad = structuredClone(seed);
  bad.products[0].image = 'javascript:alert(1)';
  assert.throws(() => validateCatalog(bad), /HTTPS/);
});

test('login requires correct credentials and issues an HTTP-only signed session', async () => {
  setTestEnvironment();
  const bad = await sessionApi.fetch(new Request(origin + '/api/session', {
    method: 'POST', headers: { Origin: origin },
    body: JSON.stringify({ username: 'michel', password: 'wrong' })
  }));
  assert.equal(bad.status, 401);
  const good = await sessionApi.fetch(new Request(origin + '/api/session', {
    method: 'POST', headers: { Origin: origin },
    body: JSON.stringify({ username: 'michel', password: 'temporary-michel-secret' })
  }));
  assert.equal(good.status, 200);
  const cookie = good.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  const current = await sessionApi.fetch(new Request(origin + '/api/session', { headers: { Cookie: cookie } }));
  assert.equal((await current.json()).username, 'michel');
  const rawCookie = cookie.split(';')[0];
  const tamperedCookie = rawCookie.replace('=', '=x');
  const tampered = await sessionApi.fetch(new Request(origin + '/api/session', { headers: { Cookie: tamperedCookie } }));
  assert.equal((await tampered.json()).username, null);
});

test('write operations reject unauthenticated and cross-origin requests', async () => {
  setTestEnvironment();
  const catalog = await catalogApi.fetch(new Request(origin + '/api/catalog', {
    method: 'PUT', headers: { Origin: origin },
    body: JSON.stringify({ catalog: seed, sha: 'abc' })
  }));
  assert.equal(catalog.status, 401);
  const upload = await signatureApi.fetch(new Request(origin + '/api/upload-signature', { method: 'POST', headers: { Origin: origin } }));
  assert.equal(upload.status, 401);
  const login = await sessionApi.fetch(new Request(origin + '/api/session', {
    method: 'POST', headers: { Origin: 'https://different.example' },
    body: JSON.stringify({ username: 'michel', password: 'temporary-michel-secret' })
  }));
  assert.equal(login.status, 403);
});

test('Cloudinary signature is scoped to the product folder and protected by a session', async () => {
  setTestEnvironment();
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  const login = await sessionApi.fetch(new Request(origin + '/api/session', {
    method: 'POST', headers: { Origin: origin },
    body: JSON.stringify({ username: 'zahira', password: 'temporary-zahira-secret' })
  }));
  const response = await signatureApi.fetch(new Request(origin + '/api/upload-signature', {
    method: 'POST', headers: { Origin: origin, Cookie: login.headers.get('set-cookie') }
  }));
  assert.equal(response.status, 200);
  const signed = await response.json();
  assert.equal(signed.folder, 'labiu-cakes/products');
  assert.equal(signed.signature, createHash('sha1').update('folder=' + signed.folder + '&timestamp=' + signed.timestamp + 'test-secret').digest('hex'));
});

test('GitHub JSON updates preserve the file SHA and reject stale saves', async () => {
  setTestEnvironment();
  process.env.GITHUB_TOKEN = 'test-token';
  const previousFetch = globalThis.fetch;
  const writes = [];
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'PUT') {
      writes.push(JSON.parse(options.body));
      return Response.json({ content: { sha: 'next-sha' } });
    }
    return Response.json({ sha: 'current-sha', content: Buffer.from(JSON.stringify(seed)).toString('base64') });
  };
  try {
    const login = await sessionApi.fetch(new Request(origin + '/api/session', {
      method: 'POST', headers: { Origin: origin },
      body: JSON.stringify({ username: 'michel', password: 'temporary-michel-secret' })
    }));
    const headers = { Origin: origin, Cookie: login.headers.get('set-cookie') };
    const stale = await catalogApi.fetch(new Request(origin + '/api/catalog', {
      method: 'PUT', headers, body: JSON.stringify({ sha: 'stale-sha', catalog: seed })
    }));
    assert.equal(stale.status, 409);
    const saved = await catalogApi.fetch(new Request(origin + '/api/catalog', {
      method: 'PUT', headers, body: JSON.stringify({ sha: 'current-sha', catalog: seed })
    }));
    assert.equal(saved.status, 200);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].sha, 'current-sha');
    assert.equal(JSON.parse(Buffer.from(writes[0].content, 'base64').toString()).products.length, 8);
  } finally {
    globalThis.fetch = previousFetch;
    delete process.env.GITHUB_TOKEN;
  }
});
