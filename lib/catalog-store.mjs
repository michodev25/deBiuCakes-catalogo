import { readFileSync } from 'node:fs';

const localCatalog = JSON.parse(readFileSync(new URL('../dist/catalog.json', import.meta.url), 'utf8'));

function githubUrl() {
  const repository = process.env.GITHUB_REPOSITORY || 'michodev25/deBiuCakes-catalogo';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY no es válido.');
  return `https://api.github.com/repos/${repository}/contents/dist/catalog.json`;
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'LaBiuCakes-cakeadmin'
  };
}

export function validateCatalog(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.categories) || !Array.isArray(input.products)) throw new Error('El catálogo no tiene el formato esperado.');
  if (input.categories.length < 1 || input.categories.length > 100 || input.products.length > 500) throw new Error('Cantidad de categorías o productos no permitida.');
  const categories = input.categories.map((value) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 50 || value.trim().toLocaleLowerCase('es') === 'todos') throw new Error('Hay una categoría no válida.');
    return value.trim();
  });
  const normalized = categories.map((value) => value.toLocaleLowerCase('es'));
  if (new Set(normalized).size !== normalized.length) throw new Error('No puede haber categorías repetidas.');
  const ids = new Set();
  const products = input.products.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Hay un producto no válido.');
    const id = String(item.id || '').trim();
    const name = String(item.name || '').trim();
    const description = String(item.description || '').trim();
    const badge = String(item.badge || '').trim();
    const category = String(item.category || '').trim();
    if (!/^[\w-]{1,64}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) || ids.has(id)) throw new Error('Hay identificadores de producto repetidos o no válidos.');
    ids.add(id);
    if (!name || name.length > 100 || description.length > 1000 || badge.length > 30) throw new Error(`Revisa el nombre, descripción o distintivo de ${name || 'un producto'}.`);
    if (!categories.includes(category)) throw new Error(`La categoría de ${name} no existe.`);
    if (!Number.isInteger(item.price) || item.price < 1 || item.price > 1_000_000_000) throw new Error(`El precio de ${name} no es válido.`);
    if (typeof item.visible !== 'boolean') throw new Error(`La visibilidad de ${name} no es válida.`);
    let image;
    try { image = new URL(item.image); } catch { throw new Error(`La imagen de ${name} no es válida.`); }
    if (image.protocol !== 'https:' || image.username || image.password || String(item.image).length > 2048) throw new Error(`La imagen de ${name} debe ser una URL HTTPS.`);
    return { id, name, category, price: item.price, badge, image: image.toString(), description, visible: item.visible };
  });
  return { version: 1, categories, products };
}

export async function readCatalog() {
  if (!process.env.GITHUB_TOKEN) return { catalog: localCatalog, sha: null, configured: false };
  const response = await fetch(`${githubUrl()}?ref=${encodeURIComponent(process.env.GITHUB_BRANCH || 'main')}`, { headers: githubHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub no pudo leer el catálogo (${response.status}).`);
  const file = await response.json();
  const catalog = validateCatalog(JSON.parse(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8')));
  return { catalog, sha: file.sha, configured: true };
}

export async function writeCatalog(catalog, expectedSha, username) {
  if (!process.env.GITHUB_TOKEN) throw new Error('Falta configurar GITHUB_TOKEN en Vercel.');
  const current = await readCatalog();
  if (expectedSha !== current.sha) return { conflict: true };
  const validated = validateCatalog(catalog);
  const response = await fetch(githubUrl(), {
    method: 'PUT',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `content(catalog): update by ${username}`,
      content: Buffer.from(`${JSON.stringify(validated, null, 2)}\n`).toString('base64'),
      sha: current.sha,
      branch: process.env.GITHUB_BRANCH || 'main'
    })
  });
  if (response.status === 409) return { conflict: true };
  if (!response.ok) throw new Error(`GitHub no pudo guardar el catálogo (${response.status}).`);
  const result = await response.json();
  return { catalog: validated, sha: result.content.sha };
}
