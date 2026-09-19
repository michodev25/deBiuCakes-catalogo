import assert from 'node:assert/strict';

const endpoint = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9228';
const site = process.env.CAKE_SITE_URL || 'http://127.0.0.1:4173';
const targets = await fetch(endpoint + '/json/list').then((response) => response.json());
const target = targets.find((item) => item.type === 'page');
if (!target) throw new Error('Chrome no tiene una pestaña de pruebas.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let nextId = 1;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, expected = true) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await evaluate(expression) === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Tiempo agotado esperando: ' + expression);
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: site + '/' });
  await waitFor('document.querySelectorAll(".product-card").length === 8');
  await evaluate('localStorage.removeItem("labiucakes-cart"); localStorage.removeItem("labiucakes-currency"); location.reload()');
  await waitFor('document.querySelectorAll(".product-card").length === 8');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'La página no debe desbordarse horizontalmente.');
  assert.match(await evaluate('document.querySelector("#currency-current").textContent'), /USD/);
  assert.equal(await evaluate('document.querySelector("#currency-trigger").getAttribute("aria-expanded")'), 'false');
  assert.equal(await evaluate('document.querySelector(".product-price .price-primary").classList.contains("price-usd")'), true);
  assert.equal(await evaluate('document.querySelectorAll(".product-card .price-usd").length'), 8);
  assert.equal(await evaluate('document.querySelectorAll(".product-card .price-cup").length'), 8);
  await waitFor('document.querySelector("[data-rate-label]").textContent.startsWith("Referencia manual") || document.querySelector("[data-rate-label]").textContent.startsWith("Tasa consultada de elTOQUE")');
  assert.match(await evaluate('document.querySelector("[data-rate-label]").textContent'), /referencia manual|Tasa consultada de elTOQUE/i);
  await evaluate('window.__firstCard = document.querySelector(".product-card")');
  await evaluate('document.querySelector("#currency-trigger").click()');
  assert.equal(await evaluate('document.querySelector("#currency-menu").hidden'), false);
  assert.equal(await evaluate('document.querySelectorAll("#currency-menu [role=menuitemradio]").length'), 2);
  const menuLayout = await evaluate('(() => { const menu = document.querySelector("#currency-menu"); const trigger = document.querySelector("#currency-trigger"); const box = menu.getBoundingClientRect(); return { background: getComputedStyle(menu).backgroundColor, top: box.top, right: box.right, triggerBottom: trigger.getBoundingClientRect().bottom, optionHeight: menu.querySelector(".currency-option").getBoundingClientRect().height }; })()');
  assert.notEqual(menuLayout.background, 'rgba(0, 0, 0, 0)', 'El menú abierto debe tener fondo diseñado.');
  assert.equal(menuLayout.top >= menuLayout.triggerBottom && menuLayout.right <= 390 && menuLayout.optionHeight >= 44, true, 'Las opciones deben caber y ser táctiles en móvil.');
  await evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))');
  assert.equal(await evaluate('document.activeElement.dataset.currencyChoice'), 'CUP');
  await evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))');
  assert.equal(await evaluate('document.querySelector("#currency-menu").hidden'), true);
  assert.equal(await evaluate('document.activeElement.id'), 'currency-trigger');
  await evaluate('document.querySelector("#currency-trigger").click(); document.querySelector("[data-currency-choice=CUP]").click()');
  assert.equal(await evaluate('document.querySelector("[data-currency-choice=CUP]").getAttribute("aria-checked")'), 'true');
  assert.equal(await evaluate('document.querySelector("#currency-menu").hidden'), true);
  assert.equal(await evaluate('document.querySelector(".product-price .price-primary").classList.contains("price-cup")'), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Los precios en CUP no deben desbordar el móvil.');
  assert.equal(await evaluate('document.querySelector(".product-card") === window.__firstCard'), true, 'Cambiar de moneda no debe reconstruir las tarjetas.');
  await evaluate('document.querySelector(".detail-link").click()');
  assert.equal(await evaluate('document.querySelector("[data-dialog-price] .price-primary").classList.contains("price-cup")'), true);
  await evaluate('document.querySelector("[data-close-dialog]").click()');
  const beforeRate = await evaluate('document.querySelector(".product-price .price-cup").textContent');
  await evaluate('window.__originalFetch = window.fetch; window.fetch = (url, options) => url === "/api/exchange-rate" ? Promise.resolve({ ok: true, json: async () => ({ usdCup: 913, source: "eltoque", observedAt: "2026-09-19T12:00:00Z", stale: false }) }) : window.__originalFetch(url, options); loadRate().finally(() => { window.fetch = window.__originalFetch })');
  await waitFor('document.querySelector("[data-rate-label]").textContent.includes("913")');
  assert.notEqual(await evaluate('document.querySelector(".product-price .price-cup").textContent'), beforeRate);
  assert.equal(await evaluate('document.querySelector(".product-card") === window.__firstCard'), true, 'Actualizar la tasa no debe reconstruir las tarjetas.');
  await evaluate('document.querySelector("[data-card-increase]").click()');
  await waitFor('document.querySelector(".card-quantity span")?.textContent === "1"');
  assert.equal(await evaluate('document.querySelector(".product-card") === window.__firstCard'), true, 'Agregar al carrito no debe reconstruir la cuadrícula.');
  assert.equal(await evaluate('document.querySelector("[data-cart-count]").textContent'), '1');
  await evaluate('document.querySelector("[data-card-increase]").click()');
  await waitFor('document.querySelector(".card-quantity span")?.textContent === "2"');
  await evaluate('document.querySelector("[data-card-decrease]").click()');
  await waitFor('document.querySelector(".card-quantity span")?.textContent === "1"');
  const controlsFit = await evaluate('(() => { const a=document.querySelector(".card-quantity").getBoundingClientRect(); const b=document.querySelector(".product-media").getBoundingClientRect(); return a.left>=b.left && a.right<=b.right && a.bottom<=b.bottom; })()');
  assert.equal(controlsFit, true, 'El selector debe quedar dentro de la foto.');
  await evaluate('document.querySelector(".mobile-nav [data-open-cart]").click()');
  await waitFor('document.querySelector("[data-drawer-layer]").hidden === false');
  assert.equal(await evaluate('document.querySelectorAll(".cart-item img").length'), 1);
  assert.equal(await evaluate('document.querySelector("[data-cart-total] .price-primary").classList.contains("price-cup")'), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'El total en CUP no debe desbordar el móvil.');
  assert.match(await evaluate('document.querySelector("[data-cart-total]").textContent'), /10\.99 USD/);
  assert.match(await evaluate('document.querySelector("[data-cart-total]").textContent'), /CUP/);
  assert.equal(await evaluate('document.querySelector(".cart-item img").getBoundingClientRect().width > 0'), true, 'La imagen del pedido debe ser visible en móvil.');
  await evaluate('window.open = (url) => { window.__checkoutUrl = url }; document.querySelector("[data-checkout]").click()');
  assert.match(await evaluate('new URL(window.__checkoutUrl).searchParams.get("text")'), /Total estimado: ≈ .* CUP · \$10\.99 USD/);
  await evaluate('document.querySelector("[data-close-cart]").click()');
  await evaluate('location.reload()');
  await waitFor('document.querySelectorAll(".product-card").length === 8');
  assert.match(await evaluate('document.querySelector("#currency-current").textContent'), /CUP/, 'La moneda elegida debe conservarse al recargar.');
  assert.equal(await evaluate('document.querySelector(".product-price .price-primary").classList.contains("price-cup")'), true);
  await send('Page.navigate', { url: site + '/cakeadmin' });
  await waitFor('document.querySelector("#login-form") !== null');
  assert.equal(await evaluate('document.querySelector("#login-view").hidden'), false);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'El panel móvil no debe desbordarse horizontalmente.');
  const testPassword = process.env.CAKE_TEST_PASSWORD || process.env.CAKEADMIN_MICHEL_PASSWORD;
  if (testPassword) {
    await evaluate('document.querySelector("#username").value = "michel"; document.querySelector("#password").value = ' + JSON.stringify(testPassword) + '; document.querySelector("#login-form").requestSubmit()');
    await waitFor('document.querySelector("#dashboard-view").hidden === false');
    await waitFor('document.querySelectorAll(".admin-product").length === 8');
    await evaluate('document.querySelector("[data-tab=categories]").click()');
    assert.equal(await evaluate('document.querySelectorAll(".admin-category").length'), 4);
    await evaluate('document.querySelector("[data-tab=products]").click(); document.querySelector("#new-product").click()');
    assert.equal(await evaluate('document.querySelector("#editor-view").hidden'), false);
    assert.equal(await evaluate('document.querySelectorAll("#product-category option").length'), 5);
    assert.equal(await evaluate('document.querySelector("#product-price").name'), 'priceUsd');
    await evaluate('document.querySelector("#product-price").value = "10"; document.querySelector("#product-price").dispatchEvent(new Event("input", { bubbles: true }))');
    assert.match(await evaluate('document.querySelector("#price-cup-preview").textContent'), /CUP/);
    console.log('Browser smoke passed: catálogo móvil, cantidad, carrito, login y gestión visual.');
  } else {
    console.log('Browser smoke passed: catálogo móvil, cantidad, carrito y acceso visual a Cakeadmin.');
  }
} finally {
  socket.close();
}
