const WHATSAPP_NUMBER = "5352001457";
const state = { products: [], categories: ["Todos"], category: "Todos", search: "", cart: readCart(), currency: readCurrency(), activeProduct: null,
  rate: { usdCup: 735, source: "reference", observedAt: "2026-09-19", stale: true } };
const grid = document.querySelector("#product-grid");
const categoryList = document.querySelector("#category-list");
const currencyPicker = document.querySelector(".currency-picker");
const currencyTrigger = document.querySelector("#currency-trigger");
const currencyMenu = document.querySelector("#currency-menu");
const currencyCurrent = document.querySelector("#currency-current");
const currencyOptions = [...currencyMenu.querySelectorAll("[data-currency-choice]")];
const searchInput = document.querySelector("#search");
const emptyState = document.querySelector("#empty-state");
const resultCount = document.querySelector("[data-result-count]");
const drawerLayer = document.querySelector("[data-drawer-layer]");
const cartItems = document.querySelector("[data-cart-items]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartSummary = document.querySelector("[data-cart-summary]");
const cartTotal = document.querySelector("[data-cart-total]");
const productDialog = document.querySelector("#product-dialog");
const toast = document.querySelector("[data-toast]");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 }).format(value);
}

function formatUsd(value) {
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + " USD";
}

function formatCup(usd) {
  return "≈ $" + formatNumber(Math.round(usd * state.rate.usdCup)) + " CUP";
}

function formatPricePair(usd) {
  return state.currency === "CUP" ? formatCup(usd) + " · " + formatUsd(usd) : formatUsd(usd) + " · " + formatCup(usd);
}

function priceMarkup(usd) {
  const usdMarkup = '<span class="price-usd ' + (state.currency === "USD" ? 'price-primary' : 'price-secondary') + '">' + formatUsd(usd) + '</span>';
  const cupMarkup = '<span class="price-cup ' + (state.currency === "CUP" ? 'price-primary' : 'price-secondary') + '">' + formatCup(usd) + '</span>';
  return state.currency === "CUP" ? cupMarkup + usdMarkup : usdMarkup + cupMarkup;
}

function rateLabel() {
  const rate = state.rate;
  if (rate.source === "eltoque") {
    const status = rate.stale ? "Última tasa consultada de elTOQUE" : "Tasa consultada de elTOQUE";
    const date = new Date(rate.observedAt);
    const time = Number.isNaN(date.getTime()) ? "" : " · " + new Intl.DateTimeFormat("es-CU", { dateStyle: "short", timeStyle: "short" }).format(date);
    return status + ": 1 USD = " + formatNumber(rate.usdCup) + " CUP" + time + (rate.stale ? " · puede estar desactualizada" : "");
  }
  return "Referencia manual del 19 sep 2026: 1 USD = " + formatNumber(rate.usdCup) + " CUP · sin actualización automática";
}

function renderPrices() {
  document.querySelectorAll("[data-price-usd]").forEach((element) => {
    element.innerHTML = priceMarkup(Number(element.dataset.priceUsd));
  });
  const featured = state.products.find((product) => product.id === "1");
  if (featured) document.querySelector("[data-hero-price]").textContent = "Desde " + formatPricePair(featured.priceUsd);
}

function renderRate() {
  document.querySelectorAll("[data-rate-label]").forEach((element) => { element.textContent = rateLabel(); });
  renderPrices();
}

async function loadRate() {
  try {
    const response = await fetch("/api/exchange-rate", { cache: "no-store" });
    if (!response.ok) throw new Error("Tasa no disponible");
    const rate = await response.json();
    if (!Number.isFinite(rate.usdCup) || rate.usdCup <= 0 || !["reference", "eltoque"].includes(rate.source)) throw new Error("Tasa no válida");
    state.rate = rate;
  } catch {
    if (state.rate.source === "eltoque") state.rate = { ...state.rate, stale: true };
  }
  renderRate();
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("labiucakes-cart"));
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) => /^[\w-]+$/.test(id) && Number.isInteger(quantity) && quantity > 0));
  } catch { return {}; }
}

function readCurrency() {
  try { return localStorage.getItem("labiucakes-currency") === "CUP" ? "CUP" : "USD"; }
  catch { return "USD"; }
}

function saveCart() {
  localStorage.setItem("labiucakes-cart", JSON.stringify(state.cart));
}

function visibleProducts() {
  const query = state.search.trim().toLocaleLowerCase("es");
  return state.products.filter((product) => {
    const haystack = (product.name + " " + product.category + " " + product.description).toLocaleLowerCase("es");
    return product.visible !== false && (state.category === "Todos" || product.category === state.category) && (!query || haystack.includes(query));
  });
}

function renderCategories() {
  categoryList.innerHTML = state.categories.map((category) =>
    '<button class="category-chip ' + (state.category === category ? 'active' : '') +
    '" type="button" data-category="' + escapeHtml(category) +
    '" aria-pressed="' + (state.category === category) + '">' + escapeHtml(category) + '</button>'
  ).join("");
}

function cardControls(product) {
  const id = escapeHtml(product.id);
  const name = escapeHtml(product.name);
  const quantity = state.cart[product.id] || 0;
  return quantity
    ? '<div class="card-quantity" aria-label="' + quantity + ' de ' + name + ' en tu pedido">' +
      '<button type="button" data-card-decrease="' + id + '" aria-label="Restar uno de ' + name + '">−</button>' +
      '<span aria-live="polite">' + quantity + '</span>' +
      '<button type="button" data-card-increase="' + id + '" aria-label="Agregar uno de ' + name + '">+</button></div>'
    : '<button class="quick-add" type="button" data-card-increase="' + id + '" aria-label="Agregar ' + name + ' al pedido">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>';
}

function renderProducts() {
  const filtered = visibleProducts();
  resultCount.textContent = filtered.length;
  emptyState.hidden = filtered.length !== 0;
  grid.hidden = filtered.length === 0;
  grid.innerHTML = filtered.map((product, index) => {
    const id = escapeHtml(product.id);
    const name = escapeHtml(product.name);
    return '<article class="product-card" style="animation-delay:' + Math.min(index * 55, 280) + 'ms">' +
      '<div class="product-media" data-product="' + id + '" role="button" tabindex="0" aria-label="Ver ' + name + '">' +
      '<img src="' + escapeHtml(product.image) + '" alt="' + name + '" loading="' + (index > 3 ? 'lazy' : 'eager') + '" />' +
      (product.badge ? '<span class="product-badge">' + escapeHtml(product.badge) + '</span>' : '') + cardControls(product) +
      '</div><div class="product-info"><p class="product-category">' + escapeHtml(product.category) + '</p>' +
      '<h3>' + name + '</h3><div class="product-bottom"><span class="product-price" data-price-usd="' + product.priceUsd + '">' + priceMarkup(product.priceUsd) +
      '</span><button class="detail-link" type="button" data-product="' + id + '">Ver detalles</button></div></div></article>';
  }).join("");
}

function syncProductControls() {
  for (const media of grid.querySelectorAll(".product-media")) {
    const product = state.products.find((item) => item.id === media.dataset.product);
    if (!product) continue;
    const quantity = state.cart[product.id] || 0;
    const current = media.querySelector(".card-quantity, .quick-add");
    if (!current) continue;
    if (quantity && current.classList.contains("card-quantity")) {
      current.setAttribute("aria-label", quantity + " de " + product.name + " en tu pedido");
      current.querySelector("span").textContent = quantity;
      continue;
    }
    if (!quantity && current.classList.contains("quick-add")) continue;
    const hadFocus = current.contains(document.activeElement);
    current.outerHTML = cardControls(product);
    if (hadFocus) media.querySelector(quantity ? "[data-card-increase]" : ".quick-add")?.focus({ preventScroll: true });
  }
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => ({ product: state.products.find((item) => item.id === id), quantity }))
    .filter((entry) => entry.product && entry.product.visible !== false && entry.quantity > 0);
}

function renderDialogControls() {
  if (!state.activeProduct) return;
  const quantity = state.cart[state.activeProduct.id] || 0;
  const controls = productDialog.querySelector("[data-dialog-quantity]");
  controls.hidden = quantity === 0;
  productDialog.querySelector("[data-dialog-add]").hidden = quantity > 0;
  controls.querySelector("[data-dialog-count]").textContent = quantity;
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCents = entries.reduce((sum, entry) => sum + Math.round(entry.product.priceUsd * 100) * entry.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((element) => { element.textContent = count; });
  cartEmpty.hidden = entries.length > 0;
  cartSummary.hidden = entries.length === 0;
  cartTotal.dataset.priceUsd = totalCents / 100;
  cartTotal.innerHTML = priceMarkup(totalCents / 100);
  cartItems.innerHTML = entries.map(({ product, quantity }) => {
    const id = escapeHtml(product.id);
    const name = escapeHtml(product.name);
    return '<article class="cart-item"><img src="' + escapeHtml(product.image) + '" alt="" />' +
      '<div><h3>' + name + '</h3><p class="cart-item-price" data-price-usd="' + product.priceUsd + '">' + priceMarkup(product.priceUsd) + '</p>' +
      '<div class="quantity" aria-label="Cantidad de ' + name + '">' +
      '<button type="button" data-decrease="' + id + '" aria-label="Restar uno">−</button>' +
      '<span>' + quantity + '</span><button type="button" data-increase="' + id + '" aria-label="Agregar uno">+</button>' +
      '</div></div><button class="remove-item" type="button" data-remove="' + id + '" aria-label="Eliminar ' + name + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button></article>';
  }).join("");
  saveCart();
  syncProductControls();
  renderDialogControls();
}

function updateQuantity(id, delta) {
  if (!state.products.some((product) => product.id === id && product.visible !== false)) return;
  const next = (state.cart[id] || 0) + delta;
  if (next <= 0) delete state.cart[id];
  else state.cart[id] = next;
  renderCart();
}

function openCart() {
  drawerLayer.hidden = false;
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => drawerLayer.querySelector("[data-close-cart]").focus());
}

function closeCart() {
  drawerLayer.hidden = true;
  document.body.classList.remove("no-scroll");
}

function openProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  state.activeProduct = product;
  productDialog.querySelector("[data-dialog-image]").src = product.image;
  productDialog.querySelector("[data-dialog-image]").alt = product.name;
  productDialog.querySelector("[data-dialog-category]").textContent = product.category;
  productDialog.querySelector("[data-dialog-name]").textContent = product.name;
  productDialog.querySelector("[data-dialog-description]").textContent = product.description;
  productDialog.querySelector("[data-dialog-price]").dataset.priceUsd = product.priceUsd;
  productDialog.querySelector("[data-dialog-price]").innerHTML = priceMarkup(product.priceUsd);
  renderDialogControls();
  productDialog.showModal();
}

function closeProduct() {
  productDialog.close();
  state.activeProduct = null;
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function checkout() {
  const entries = cartEntries();
  if (!entries.length) return;
  const note = document.querySelector("#order-note").value.trim();
  const lines = entries.map(({ product, quantity }) => {
    const subtotal = Math.round(product.priceUsd * 100) * quantity / 100;
    return "• " + quantity + " × " + product.name + " — " + formatPricePair(subtotal);
  });
  const total = entries.reduce((sum, entry) => sum + Math.round(entry.product.priceUsd * 100) * entry.quantity, 0) / 100;
  const message = ["Hola, LaBiu Dulceria Panaderia. Quisiera consultar este pedido:", "", ...lines, "",
    "Total estimado: " + formatPricePair(total), rateLabel(),
    note ? "Nota: " + note : ""].filter(Boolean).join("\n");
  if (!WHATSAPP_NUMBER) {
    navigator.clipboard?.writeText(message);
    showToast("Pedido preparado · falta conectar el WhatsApp real");
    return;
  }
  window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
}

function setupModelContextTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const register = (definition) => {
    try { Promise.resolve(context.registerTool(definition)).catch(() => {}); } catch { /* Optional browser capability. */ }
  };
  register({
    name: "read_catalog",
    title: "Consultar catálogo",
    description: "Devuelve los productos disponibles de LaBiu Dulceria Panaderia.",
    inputSchema: { type: "object", properties: { query: { type: "string", maxLength: 80 }, category: { type: "string" } }, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Consulta no válida.");
      if (input.category !== undefined && !state.categories.includes(input.category)) throw new Error("Categoría no válida.");
      const query = String(input.query || "").trim().toLocaleLowerCase("es");
      return state.products.filter((product) => product.visible !== false &&
        (!input.category || input.category === "Todos" || product.category === input.category) &&
        (!query || (product.name + " " + product.description).toLocaleLowerCase("es").includes(query)))
        .map(({ id, name, category, priceUsd }) => ({ id, name, category, priceUsd, currency: "USD", approximateCup: Math.round(priceUsd * state.rate.usdCup), rate: state.rate }));
    }
  });
  register({
    name: "add_items_to_order",
    title: "Agregar al pedido",
    description: "Agrega productos del catálogo al pedido visible.",
    inputSchema: { type: "object", properties: { items: { type: "array", minItems: 1, maxItems: 20,
      items: { type: "object", properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1, maximum: 12 } },
        required: ["productId", "quantity"], additionalProperties: false } } }, required: ["items"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) throw new Error("Incluye entre 1 y 20 productos.");
      const checked = input.items.map((item) => {
        const product = state.products.find((candidate) => candidate.id === String(item?.productId) && candidate.visible !== false);
        if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 12) throw new Error("Producto o cantidad no válida.");
        return { product, quantity: item.quantity };
      });
      checked.forEach(({ product, quantity }) => { state.cart[product.id] = (state.cart[product.id] || 0) + quantity; });
      renderCart();
      return { status: "added", itemCount: cartEntries().reduce((sum, entry) => sum + entry.quantity, 0) };
    }
  });
}

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
});
function syncCurrencyMenu() {
  currencyCurrent.textContent = state.currency === "CUP" ? "CUP · pesos" : "USD · dólares";
  currencyOptions.forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.currencyChoice === state.currency));
  });
}

function closeCurrencyMenu(restoreFocus = false) {
  if (currencyMenu.hidden) return;
  currencyMenu.hidden = true;
  currencyTrigger.setAttribute("aria-expanded", "false");
  if (restoreFocus) currencyTrigger.focus();
}

function openCurrencyMenu(focusIndex = currencyOptions.findIndex((option) => option.dataset.currencyChoice === state.currency)) {
  currencyMenu.hidden = false;
  currencyTrigger.setAttribute("aria-expanded", "true");
  currencyOptions[Math.max(0, focusIndex)].focus();
}

function chooseCurrency(value) {
  if (!["USD", "CUP"].includes(value)) return;
  state.currency = value;
  try { localStorage.setItem("labiucakes-currency", state.currency); } catch { /* La selección sigue activa durante esta visita. */ }
  syncCurrencyMenu();
  renderPrices();
  closeCurrencyMenu(true);
}

syncCurrencyMenu();
currencyTrigger.addEventListener("click", () => {
  if (currencyMenu.hidden) openCurrencyMenu();
  else closeCurrencyMenu(true);
});
currencyMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-currency-choice]");
  if (option) chooseCurrency(option.dataset.currencyChoice);
});
currencyPicker.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !currencyMenu.hidden) {
    event.preventDefault();
    closeCurrencyMenu(true);
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (currencyMenu.hidden) openCurrencyMenu(event.key === "ArrowDown" ? 0 : currencyOptions.length - 1);
    else {
      const index = currencyOptions.indexOf(document.activeElement);
      const next = (index + (event.key === "ArrowDown" ? 1 : -1) + currencyOptions.length) % currencyOptions.length;
      currencyOptions[next].focus();
    }
  } else if (!currencyMenu.hidden && (event.key === "Home" || event.key === "End")) {
    event.preventDefault();
    currencyOptions[event.key === "Home" ? 0 : currencyOptions.length - 1].focus();
  }
});
currencyPicker.addEventListener("focusout", (event) => {
  if (!currencyPicker.contains(event.relatedTarget)) closeCurrencyMenu();
});
document.addEventListener("pointerdown", (event) => {
  if (!currencyPicker.contains(event.target)) closeCurrencyMenu();
});
searchInput.addEventListener("input", (event) => { state.search = event.target.value; renderProducts(); });
grid.addEventListener("click", (event) => {
  const increase = event.target.closest("[data-card-increase]");
  const decrease = event.target.closest("[data-card-decrease]");
  if (increase || decrease) {
    event.stopPropagation();
    updateQuantity(increase ? increase.dataset.cardIncrease : decrease.dataset.cardDecrease, increase ? 1 : -1);
    return;
  }
  const target = event.target.closest("[data-product]");
  if (target) openProduct(target.dataset.product);
});
grid.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".product-media")) {
    event.preventDefault();
    openProduct(event.target.dataset.product);
  }
});
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]")) closeCart();
  if (event.target.closest("[data-close-dialog]")) closeProduct();
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  const remove = event.target.closest("[data-remove]");
  if (increase) updateQuantity(increase.dataset.increase, 1);
  if (decrease) updateQuantity(decrease.dataset.decrease, -1);
  if (remove) { delete state.cart[remove.dataset.remove]; renderCart(); }
  if (event.target.closest("[data-clear-filters]")) {
    state.category = "Todos"; state.search = ""; searchInput.value = ""; renderCategories(); renderProducts();
  }
  if (event.target.closest("[data-dialog-add]") && state.activeProduct) updateQuantity(state.activeProduct.id, 1);
  if (event.target.closest("[data-dialog-increase]") && state.activeProduct) updateQuantity(state.activeProduct.id, 1);
  if (event.target.closest("[data-dialog-decrease]") && state.activeProduct) updateQuantity(state.activeProduct.id, -1);
  if (event.target.closest("[data-checkout]")) checkout();
});
productDialog.addEventListener("click", (event) => {
  const rect = productDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProduct();
});
productDialog.addEventListener("close", () => { state.activeProduct = null; });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !drawerLayer.hidden) closeCart(); });

async function loadCatalog() {
  let catalog;
  try {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    if (!response.ok) throw new Error("API no disponible");
    catalog = (await response.json()).catalog;
  } catch {
    try {
      const response = await fetch("./catalog.json", { cache: "no-store" });
      if (!response.ok) throw new Error("JSON no disponible");
      catalog = await response.json();
    } catch {
      emptyState.querySelector("h3").textContent = "No se pudo cargar el catálogo";
      emptyState.querySelector("p").textContent = "Inténtalo de nuevo en unos minutos.";
      emptyState.querySelector("button").hidden = true;
      emptyState.hidden = false;
      return;
    }
  }
  state.products = catalog.products.map((product) => ({ ...product, id: String(product.id),
    priceUsd: catalog.version === 1 ? Math.round(product.price / 710 * 100) / 100 : product.priceUsd }));
  for (const id of Object.keys(state.cart)) {
    if (!state.products.some((product) => product.id === id && product.visible !== false)) delete state.cart[id];
  }
  state.categories = ["Todos", ...catalog.categories];
  renderCategories();
  renderProducts();
  renderCart();
  setupModelContextTools();
  await loadRate();
}
loadCatalog();
setInterval(loadRate, 10 * 60 * 1000);
