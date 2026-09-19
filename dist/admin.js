const admin = {
  username: null,
  catalog: null,
  sha: null,
  editorId: null,
  renamingCategory: null,
  rate: { usdCup: 710, source: "reference", observedAt: "2026-09-19", stale: true },
  busy: false
};

const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const dashboardMessage = document.querySelector("#dashboard-message");
const productList = document.querySelector("#product-list");
const categoryList = document.querySelector("#category-list-admin");
const editorView = document.querySelector("#editor-view");
const productsView = document.querySelector("#products-view");
const categoriesView = document.querySelector("#categories-view");
const productForm = document.querySelector("#product-form");
const productImage = document.querySelector("#product-image");
const imagePreview = document.querySelector("#image-preview");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 }).format(value);
}

function formatUsd(value) {
  return "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + " USD";
}

function formatCup(usd) {
  return "≈ $" + formatPrice(Math.round(usd * admin.rate.usdCup)) + " CUP";
}

function renderRatePreview() {
  const usd = Number(productForm.elements.priceUsd.value) || 0;
  document.querySelector("#price-cup-preview").textContent = formatCup(usd);
  const rate = admin.rate;
  document.querySelector("#admin-rate-note").textContent = rate.source === "eltoque"
    ? (rate.stale ? "Última tasa consultada de elTOQUE" : "Tasa consultada de elTOQUE") + ": 1 USD = " + formatPrice(rate.usdCup) + " CUP"
    : "Referencia manual del 19 sep 2026: 1 USD = " + formatPrice(rate.usdCup) + " CUP; sin actualización automática";
}

async function loadRate() {
  try {
    const rate = await requestJson("/api/exchange-rate");
    if (Number.isFinite(rate.usdCup) && rate.usdCup > 0) admin.rate = rate;
  } catch { /* La referencia fechada sigue disponible si la API falla. */ }
  renderRatePreview();
  if (admin.catalog) renderProducts();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "No se pudo completar la operación.");
  return result;
}

function showMessage(message, success = false) {
  dashboardMessage.textContent = message;
  dashboardMessage.classList.toggle("success", success);
}

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
  document.querySelector("#logout").hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  document.querySelector("#logout").hidden = false;
  document.querySelector("#welcome-user").textContent = admin.username;
}

async function loadCatalog() {
  const result = await requestJson("/api/catalog");
  admin.catalog = result.catalog;
  admin.sha = result.sha;
  renderAll();
  await loadRate();
  if (!result.configured) showMessage("Vista previa: configura GITHUB_TOKEN en Vercel para poder guardar cambios.");
}

function renderStats() {
  document.querySelector("#stat-products").textContent = admin.catalog.products.length;
  document.querySelector("#stat-visible").textContent = admin.catalog.products.filter((product) => product.visible !== false).length;
  document.querySelector("#stat-categories").textContent = admin.catalog.categories.length;
}

function renderProducts() {
  if (!admin.catalog.products.length) {
    productList.innerHTML = '<div class="empty-admin">Todavía no hay productos. Crea el primero con “Nuevo producto”.</div>';
    return;
  }
  productList.innerHTML = admin.catalog.products.map((product) =>
    '<article class="admin-product">' +
    '<img src="' + escapeHtml(product.image) + '" alt="" loading="lazy" />' +
    '<div class="admin-product-name"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(product.category) + '</small></div>' +
    '<span class="admin-product-price">' + formatUsd(product.priceUsd) + '<small>' + formatCup(product.priceUsd) + '</small></span>' +
    '<span class="status-pill ' + (product.visible === false ? 'is-hidden' : '') + '">' + (product.visible === false ? 'Oculto' : 'Visible') + '</span>' +
    '<div class="row-actions"><button type="button" data-edit="' + escapeHtml(product.id) + '" aria-label="Editar ' + escapeHtml(product.name) + '">Editar</button>' +
    '<button class="danger" type="button" data-delete="' + escapeHtml(product.id) + '" aria-label="Eliminar ' + escapeHtml(product.name) + '">×</button></div></article>'
  ).join("");
}

function renderCategories() {
  categoryList.innerHTML = admin.catalog.categories.map((category) => {
    const count = admin.catalog.products.filter((product) => product.category === category).length;
    if (admin.renamingCategory === category) {
      return '<form class="admin-category rename-form" data-old-category="' + escapeHtml(category) + '">' +
        '<input name="name" aria-label="Nuevo nombre para ' + escapeHtml(category) + '" maxlength="50" required value="' + escapeHtml(category) + '" />' +
        '<div class="category-actions"><button type="submit">Guardar</button><button type="button" data-cancel-rename>Cancelar</button></div></form>';
    }
    return '<div class="admin-category"><span class="category-name">' + escapeHtml(category) + '</span>' +
      '<small>' + count + ' producto' + (count === 1 ? '' : 's') + '</small>' +
      '<div class="category-actions"><button type="button" data-rename="' + escapeHtml(category) + '">Renombrar</button>' +
      '<button class="danger" type="button" data-delete-category="' + escapeHtml(category) + '" aria-label="Eliminar ' + escapeHtml(category) + '">×</button></div></div>';
  }).join("");
}

function renderAll() {
  renderStats();
  renderProducts();
  renderCategories();
  const select = document.querySelector("#product-category");
  const current = select.value;
  select.innerHTML = '<option value="">Selecciona una categoría</option>' + admin.catalog.categories.map((category) =>
    '<option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>'
  ).join("");
  if (admin.catalog.categories.includes(current)) select.value = current;
}

function chooseTab(tab) {
  const products = tab === "products";
  productsView.hidden = !products;
  categoriesView.hidden = products;
  editorView.hidden = true;
  document.querySelectorAll("[data-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === tab)));
  document.querySelector("#new-product").hidden = !products;
  document.querySelector(".admin-tabs").hidden = false;
  admin.editorId = null;
}

function previewImage(url) {
  if (url) imagePreview.innerHTML = '<img src="' + escapeHtml(url) + '" alt="Vista previa del producto" />';
  else imagePreview.innerHTML = '<span>✿</span><p>Tu foto aparecerá aquí</p>';
}

function openEditor(id = null) {
  admin.editorId = id;
  productForm.reset();
  const product = id ? admin.catalog.products.find((item) => item.id === id) : null;
  if (product) {
    productForm.elements.name.value = product.name;
    productForm.elements.category.value = product.category;
    productForm.elements.priceUsd.value = product.priceUsd;
    productForm.elements.description.value = product.description;
    productForm.elements.badge.value = product.badge;
    productForm.elements.image.value = product.image;
    productForm.elements.visible.checked = product.visible !== false;
  } else {
    productForm.elements.visible.checked = true;
    if (admin.catalog.categories.length === 1) productForm.elements.category.value = admin.catalog.categories[0];
  }
  previewImage(product?.image || "");
  renderRatePreview();
  document.querySelector("#editor-heading").textContent = product ? "Editar producto" : "Nuevo producto";
  productsView.hidden = true;
  categoriesView.hidden = true;
  editorView.hidden = false;
  document.querySelector(".admin-tabs").hidden = true;
  document.querySelector("#new-product").hidden = true;
  editorView.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveCatalog(next, successMessage) {
  if (admin.busy) return;
  admin.busy = true;
  document.querySelectorAll(".admin-primary").forEach((button) => { button.disabled = true; });
  showMessage("Guardando cambios…");
  try {
    const result = await requestJson("/api/catalog", {
      method: "PUT",
      body: JSON.stringify({ catalog: next, sha: admin.sha })
    });
    admin.catalog = result.catalog;
    admin.sha = result.sha;
    renderAll();
    showMessage(successMessage, true);
    return true;
  } catch (error) {
    showMessage(error.message);
    return false;
  } finally {
    admin.busy = false;
    document.querySelectorAll(".admin-primary").forEach((button) => { button.disabled = false; });
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  loginMessage.textContent = "Comprobando acceso…";
  try {
    const result = await requestJson("/api/session", {
      method: "POST",
      body: JSON.stringify({ username: loginForm.elements.username.value.trim(), password: loginForm.elements.password.value })
    });
    admin.username = result.username;
    loginForm.elements.password.value = "";
    showDashboard();
    await loadCatalog();
    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.textContent = error.message;
    if (!admin.catalog) showLogin();
  } finally { button.disabled = false; }
});

document.querySelector("#logout").addEventListener("click", async () => {
  try { await requestJson("/api/session", { method: "DELETE" }); } catch { /* Expired session still logs out locally. */ }
  admin.username = null;
  admin.catalog = null;
  showLogin();
});

document.querySelector("#new-product").addEventListener("click", () => openEditor());
document.querySelector("#cancel-editor").addEventListener("click", () => chooseTab("products"));
document.querySelector("#cancel-editor-bottom").addEventListener("click", () => chooseTab("products"));
document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => chooseTab(button.dataset.tab)));

productList.addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");
  if (edit) openEditor(edit.dataset.edit);
  if (!remove) return;
  const product = admin.catalog.products.find((item) => item.id === remove.dataset.delete);
  if (!product || !confirm('¿Eliminar "' + product.name + '" del catálogo?')) return;
  const next = { ...admin.catalog, products: admin.catalog.products.filter((item) => item.id !== product.id) };
  await saveCatalog(next, "Producto eliminado del catálogo.");
});

productImage.addEventListener("input", () => previewImage(productImage.value.trim()));
productForm.elements.priceUsd.addEventListener("input", renderRatePreview);
document.querySelector("#product-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    showMessage("Usa una imagen JPG, PNG o WebP de hasta 5 MB.");
    event.target.value = "";
    return;
  }
  showMessage("Subiendo foto a Cloudinary…");
  try {
    const signed = await requestJson("/api/upload-signature", { method: "POST" });
    const data = new FormData();
    data.append("file", file);
    data.append("api_key", signed.apiKey);
    data.append("timestamp", signed.timestamp);
    data.append("folder", signed.folder);
    data.append("signature", signed.signature);
    const response = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(signed.cloudName) + "/image/upload", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "La foto no pudo subirse.");
    productImage.value = result.secure_url;
    previewImage(result.secure_url);
    showMessage("Foto subida a Cloudinary. Guarda el producto para publicarla.", true);
  } catch (error) { showMessage(error.message); }
  event.target.value = "";
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = productForm.elements;
  const image = fields.image.value.trim();
  if (!image.startsWith("https://")) { showMessage("La foto debe tener una URL HTTPS."); return; }
  const product = {
    id: admin.editorId || crypto.randomUUID(),
    name: fields.name.value.trim(),
    category: fields.category.value,
    priceUsd: Number(fields.priceUsd.value),
    description: fields.description.value.trim(),
    badge: fields.badge.value.trim(),
    image,
    visible: fields.visible.checked
  };
  const next = {
    ...admin.catalog,
    products: admin.editorId
      ? admin.catalog.products.map((item) => item.id === admin.editorId ? product : item)
      : [...admin.catalog.products, product]
  };
  if (await saveCatalog(next, admin.editorId ? "Producto actualizado." : "Producto agregado.")) chooseTab("products");
});

document.querySelector("#category-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const field = event.currentTarget.elements.category;
  const name = field.value.trim();
  if (name.toLocaleLowerCase("es") === "todos" || admin.catalog.categories.some((category) => category.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) {
    showMessage("Esa categoría ya existe.");
    return;
  }
  const next = { ...admin.catalog, categories: [...admin.catalog.categories, name] };
  if (await saveCatalog(next, "Categoría agregada.")) field.value = "";
});

categoryList.addEventListener("click", async (event) => {
  const rename = event.target.closest("[data-rename]");
  const cancel = event.target.closest("[data-cancel-rename]");
  const remove = event.target.closest("[data-delete-category]");
  if (rename) {
    admin.renamingCategory = rename.dataset.rename;
    renderCategories();
    categoryList.querySelector(".rename-form input")?.focus();
  }
  if (cancel) { admin.renamingCategory = null; renderCategories(); }
  if (!remove) return;
  const category = remove.dataset.deleteCategory;
  if (admin.catalog.products.some((product) => product.category === category)) {
    showMessage("Mueve o elimina los productos de esta categoría antes de borrarla.");
    return;
  }
  if (!confirm('¿Eliminar la categoría "' + category + '"?')) return;
  const next = { ...admin.catalog, categories: admin.catalog.categories.filter((item) => item !== category) };
  await saveCatalog(next, "Categoría eliminada.");
});

categoryList.addEventListener("submit", async (event) => {
  const form = event.target.closest(".rename-form");
  if (!form) return;
  event.preventDefault();
  const oldName = form.dataset.oldCategory;
  const newName = form.elements.name.value.trim();
  if (!newName || newName.toLocaleLowerCase("es") === "todos" || admin.catalog.categories.some((item) => item !== oldName && item.toLocaleLowerCase("es") === newName.toLocaleLowerCase("es"))) {
    showMessage("Elige un nombre distinto y no repetido.");
    return;
  }
  const next = {
    ...admin.catalog,
    categories: admin.catalog.categories.map((item) => item === oldName ? newName : item),
    products: admin.catalog.products.map((product) => product.category === oldName ? { ...product, category: newName } : product)
  };
  if (await saveCatalog(next, "Categoría y productos actualizados.")) admin.renamingCategory = null;
  renderCategories();
});

async function initialize() {
  try {
    const session = await requestJson("/api/session");
    if (!session.username) {
      showLogin();
      if (!session.configured) loginMessage.textContent = "El acceso se activará al configurar las variables privadas en Vercel.";
      return;
    }
    admin.username = session.username;
    showDashboard();
    await loadCatalog();
  } catch {
    showLogin();
    loginMessage.textContent = "El panel necesita las funciones de Vercel. Esta vista previa estática solo muestra el diseño.";
  }
}
initialize();
setInterval(loadRate, 10 * 60 * 1000);
