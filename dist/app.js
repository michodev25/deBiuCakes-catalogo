const WHATSAPP_NUMBER = "";

const products = [
  {
    id: 1,
    name: "Jardín de fresas",
    category: "Cakes",
    price: 7800,
    badge: "Favorito",
    image: "https://images.unsplash.com/photo-1604413191066-4dd20bedf486?auto=format&fit=crop&fm=jpg&q=82&w=900",
    description: "Bizcocho de vainilla, relleno de crema suave y fresas, terminado con flores de merengue en tonos rosados."
  },
  {
    id: 2,
    name: "Mini cake Cielito",
    category: "Mini cakes",
    price: 2950,
    badge: "Nuevo",
    image: "https://images.pexels.com/photos/37108067/pexels-photo-37108067.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Mini cake para dos o cuatro personas, con crema azul cielo, perlitas delicadas y relleno a elegir."
  },
  {
    id: 3,
    name: "Cupcakes Blush · 6 u",
    category: "Cupcakes",
    price: 2400,
    image: "https://images.pexels.com/photos/11073464/pexels-photo-11073464.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Seis cupcakes de vainilla y chocolate con remolinos de crema, flores pequeñas y detalles nacarados."
  },
  {
    id: 4,
    name: "Cake Rosé",
    category: "Cakes",
    price: 6500,
    image: "https://images.unsplash.com/photo-1644865439228-49106cb7b601?auto=format&fit=crop&fm=jpg&q=82&w=900",
    description: "Cake de vainilla y frutos rojos con abundantes ondas de crema rosa, sprinkles y una terminación alegre."
  },
  {
    id: 5,
    name: "Macarons Rosé · 12 u",
    category: "Confituras",
    price: 3200,
    image: "https://images.pexels.com/photos/29068714/pexels-photo-29068714.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Doce macarons delicados con rellenos de vainilla, fresa y chocolate blanco, presentados para regalar."
  },
  {
    id: 6,
    name: "Caja mesa dulce",
    category: "Confituras",
    price: 8900,
    badge: "Especial",
    image: "https://images.pexels.com/photos/16177484/pexels-photo-16177484.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Una selección especial de dulces florales y bocados rosados, organizada en cajas para compartir."
  },
  {
    id: 7,
    name: "Bombones para regalar",
    category: "Confituras",
    price: 3500,
    image: "https://images.pexels.com/photos/14275701/pexels-photo-14275701.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Caja rosada con bombones gourmet y lazo satinado, lista para dedicar con un mensaje corto."
  },
  {
    id: 8,
    name: "Bombones Rosé · 20 u",
    category: "Confituras",
    price: 2900,
    image: "https://images.pexels.com/photos/7103706/pexels-photo-7103706.jpeg?auto=compress&cs=tinysrgb&w=900",
    description: "Veinte bombones artesanales en una paleta rosada, perfectos para completar una mesa dulce."
  }
];

const categories = ["Todos", ...new Set(products.map((product) => product.category))];
const state = {
  category: "Todos",
  search: "",
  cart: readCart(),
  activeProduct: null
};

const grid = document.querySelector("#product-grid");
const categoryList = document.querySelector("#category-list");
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

function formatPrice(value) {
  return new Intl.NumberFormat("es-CU", { maximumFractionDigits: 0 }).format(value);
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("labiucakes-cart")) || {};
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem("labiucakes-cart", JSON.stringify(state.cart));
}

function visibleProducts() {
  const query = state.search.trim().toLocaleLowerCase("es");
  return products.filter((product) => {
    const matchesCategory = state.category === "Todos" || product.category === state.category;
    const haystack = `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("es");
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function renderCategories() {
  categoryList.innerHTML = categories.map((category) => `
    <button
      class="category-chip ${state.category === category ? "active" : ""}"
      type="button"
      data-category="${category}"
      aria-pressed="${state.category === category}"
    >${category}</button>
  `).join("");
}

function renderProducts() {
  const filtered = visibleProducts();
  resultCount.textContent = filtered.length;
  emptyState.hidden = filtered.length !== 0;
  grid.hidden = filtered.length === 0;
  grid.innerHTML = filtered.map((product, index) => `
    <article class="product-card" style="animation-delay:${Math.min(index * 55, 280)}ms">
      <div class="product-media" data-product="${product.id}" role="button" tabindex="0" aria-label="Ver ${product.name}">
        <img src="${product.image}" alt="${product.name}" loading="${index > 3 ? "lazy" : "eager"}" />
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
        <button class="quick-add" type="button" data-add="${product.id}" aria-label="Agregar ${product.name} al pedido">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      <div class="product-info">
        <p class="product-category">${product.category}</p>
        <h3>${product.name}</h3>
        <div class="product-bottom">
          <span class="product-price">$${formatPrice(product.price)} CUP</span>
          <button class="detail-link" type="button" data-product="${product.id}">Ver detalles</button>
        </div>
      </div>
    </article>
  `).join("");
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => ({ product: products.find((item) => item.id === Number(id)), quantity }))
    .filter((entry) => entry.product && entry.quantity > 0);
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + (entry.product.price * entry.quantity), 0);

  document.querySelectorAll("[data-cart-count]").forEach((element) => { element.textContent = count; });
  cartEmpty.hidden = entries.length > 0;
  cartSummary.hidden = entries.length === 0;
  cartTotal.textContent = `$${formatPrice(total)} CUP`;
  cartItems.innerHTML = entries.map(({ product, quantity }) => `
    <article class="cart-item">
      <img src="${product.image}" alt="" />
      <div>
        <h3>${product.name}</h3>
        <p>$${formatPrice(product.price)} CUP</p>
        <div class="quantity" aria-label="Cantidad de ${product.name}">
          <button type="button" data-decrease="${product.id}" aria-label="Quitar uno">−</button>
          <span>${quantity}</span>
          <button type="button" data-increase="${product.id}" aria-label="Agregar uno">+</button>
        </div>
      </div>
      <button class="remove-item" type="button" data-remove="${product.id}" aria-label="Eliminar ${product.name}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
      </button>
    </article>
  `).join("");
  saveCart();
}

function addProduct(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  renderCart();
  showToast("Añadido a tu pedido");
}

function updateQuantity(id, delta) {
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
  const product = products.find((item) => item.id === id);
  if (!product) return;
  state.activeProduct = product;
  productDialog.querySelector("[data-dialog-image]").src = product.image;
  productDialog.querySelector("[data-dialog-image]").alt = product.name;
  productDialog.querySelector("[data-dialog-category]").textContent = product.category;
  productDialog.querySelector("[data-dialog-name]").textContent = product.name;
  productDialog.querySelector("[data-dialog-description]").textContent = product.description;
  productDialog.querySelector("[data-dialog-price]").textContent = `$${formatPrice(product.price)} CUP`;
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
  const lines = entries.map(({ product, quantity }) => `• ${quantity} × ${product.name} — $${formatPrice(product.price * quantity)} CUP`);
  const total = entries.reduce((sum, entry) => sum + (entry.product.price * entry.quantity), 0);
  const message = [
    "Hola, LaBiuCakes. Quisiera consultar este pedido:",
    "",
    ...lines,
    "",
    `Total estimado: $${formatPrice(total)} CUP`,
    note ? `Nota: ${note}` : ""
  ].filter(Boolean).join("\n");

  if (!WHATSAPP_NUMBER) {
    navigator.clipboard?.writeText(message);
    showToast("Pedido preparado · falta conectar el WhatsApp real");
    return;
  }
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function setupModelContextTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  const register = (definition) => {
    try {
      Promise.resolve(context.registerTool(definition)).catch(() => {});
    } catch {
      // Browsers without a complete WebMCP implementation keep the visible UI working.
    }
  };

  register({
    name: "read_catalog",
    title: "Consultar catálogo",
    description: "Devuelve los productos disponibles de LaBiuCakes y permite filtrarlos por texto o categoría.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 80 },
        category: { type: "string", enum: categories }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input = {}) {
      if (typeof input !== "object" || input === null || Array.isArray(input)) throw new Error("La consulta debe ser un objeto.");
      const query = typeof input.query === "string" ? input.query.trim().toLocaleLowerCase("es") : "";
      if (input.query !== undefined && typeof input.query !== "string") throw new Error("query debe ser texto.");
      if (input.category !== undefined && !categories.includes(input.category)) throw new Error("Categoría no válida.");
      return products
        .filter((product) => (!input.category || input.category === "Todos" || product.category === input.category)
          && (!query || `${product.name} ${product.description}`.toLocaleLowerCase("es").includes(query)))
        .map(({ id, name, category, price }) => ({ id, name, category, price, currency: "CUP" }));
    }
  });

  register({
    name: "add_items_to_order",
    title: "Agregar al pedido",
    description: "Agrega uno o varios productos válidos al pedido visible de LaBiuCakes.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              productId: { type: "integer" },
              quantity: { type: "integer", minimum: 1, maximum: 12 }
            },
            required: ["productId", "quantity"],
            additionalProperties: false
          }
        }
      },
      required: ["items"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) throw new Error("Incluye entre 1 y 20 productos.");
      const validated = input.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item?.productId);
        if (!product) throw new Error(`No existe el producto ${item?.productId}.`);
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 12) throw new Error("Cada cantidad debe estar entre 1 y 12.");
        return { product, quantity: item.quantity };
      });
      validated.forEach(({ product, quantity }) => {
        state.cart[product.id] = (state.cart[product.id] || 0) + quantity;
      });
      renderCart();
      showToast("Productos añadidos a tu pedido");
      return {
        status: "added",
        itemCount: cartEntries().reduce((sum, entry) => sum + entry.quantity, 0)
      };
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

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
});

grid.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    event.stopPropagation();
    addProduct(Number(addButton.dataset.add));
    return;
  }
  const detailTarget = event.target.closest("[data-product]");
  if (detailTarget) openProduct(Number(detailTarget.dataset.product));
});

grid.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".product-media")) {
    event.preventDefault();
    openProduct(Number(event.target.dataset.product));
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]")) closeCart();
  if (event.target.closest("[data-close-dialog]")) closeProduct();
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  const remove = event.target.closest("[data-remove]");
  if (increase) updateQuantity(Number(increase.dataset.increase), 1);
  if (decrease) updateQuantity(Number(decrease.dataset.decrease), -1);
  if (remove) { delete state.cart[Number(remove.dataset.remove)]; renderCart(); }
  if (event.target.closest("[data-clear-filters]")) {
    state.category = "Todos";
    state.search = "";
    searchInput.value = "";
    renderCategories();
    renderProducts();
  }
  if (event.target.closest("[data-dialog-add]") && state.activeProduct) {
    addProduct(state.activeProduct.id);
    closeProduct();
  }
  if (event.target.closest("[data-checkout]")) checkout();
});

productDialog.addEventListener("click", (event) => {
  const rect = productDialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) closeProduct();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !drawerLayer.hidden) closeCart();
});

renderCategories();
renderProducts();
renderCart();
setupModelContextTools();
