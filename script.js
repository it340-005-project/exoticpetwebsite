/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} B_name
 * @property {string} B_desc
 * @property {number} B_price
 * @property {string} B_img
 */

/**
 * @typedef {Object} CartItem
 * @property {Product} product
 * @property {number} quantity
 */

/**
 * @typedef {Object} Totals
 * @property {number} subtotal
 * @property {number} tax
 * @property {number} total
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {string} email
 * @property {string} street
 * @property {string} apartment
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} phone
 */

/**
 * @typedef {Object} SavedCard
 * @property {number} id
 * @property {string} brand
 * @property {string} last4
 * @property {string} expiry
 */

/**
 * @typedef {Object} OrderLine
 * @property {string} name
 * @property {number} quantity
 */

/**
 * @typedef {Object} OrderRecord
 * @property {number} id
 * @property {string} email
 * @property {number} total
 * @property {string} createdAt
 * @property {OrderLine[]} items
 * @property {{ method: string, last4?: string }} payment
 */

class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error("Missing #" + id);
  return el;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function safeImage(value) {
  const path = String(value ?? "");
  if (!path.startsWith("/images/") || path.includes("..") || path.includes("\\") || path.includes(":")) return "";
  return path;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isPassword(value) {
  return value.length >= 6 && value.length <= 200;
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isMfaCode(value) {
  return /^\d{6}$/.test(value);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isCardNumber(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19;
}

/**
 * @param {number} quantity
 * @returns {boolean}
 */
function isQuantity(quantity) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 20;
}

/**
 * @returns {string}
 */
function nextUrl() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/**
 * @param {string} url
 * @param {RequestInit=} options
 * @returns {Promise<unknown>}
 */
async function fetchJSON(url, options) {
  const extra = options || {};
  const headers = new Headers(extra.headers || undefined);
  if (!headers.has("Content-Type") && extra.body) headers.set("Content-Type", "application/json");
  const res = await fetch(url, {
    credentials: "same-origin",
    ...extra,
    headers,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_err) {
    data = null;
  }
  if (!res.ok) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message
      : "Request failed: " + res.status;
    throw new ApiError(message, res.status);
  }
  return data;
}

/**
 * @param {unknown} value
 * @returns {Product}
 */
function asProduct(value) {
  if (!value || typeof value !== "object") throw new ApiError("Unexpected product.", 500);
  const row = /** @type {Record<string, unknown>} */ (value);
  const id = Number(row.id);
  const price = Number(row.B_price);
  if (!Number.isInteger(id) || !Number.isFinite(price)) throw new ApiError("Unexpected product.", 500);
  return {
    id,
    B_name: String(row.B_name ?? ""),
    B_desc: String(row.B_desc ?? ""),
    B_price: price,
    B_img: safeImage(row.B_img),
  };
}

/**
 * @param {unknown} data
 * @returns {Product[]}
 */
function asProducts(data) {
  if (!data || typeof data !== "object" || !("products" in data) || !Array.isArray(data.products)) {
    throw new ApiError("Unexpected product list.", 500);
  }
  return data.products.map(asProduct);
}

/**
 * @param {unknown} data
 * @returns {{ items: CartItem[], totals: Totals }}
 */
function asCart(data) {
  if (!data || typeof data !== "object" || !("items" in data) || !Array.isArray(data.items)) {
    throw new ApiError("Unexpected cart.", 500);
  }
  const totalsRaw = "totals" in data ? data.totals : null;
  const totalsObj = totalsRaw && typeof totalsRaw === "object" ? /** @type {Record<string, unknown>} */ (totalsRaw) : {};
  const items = data.items.map((item) => {
    if (!item || typeof item !== "object") throw new ApiError("Unexpected cart item.", 500);
    const row = /** @type {Record<string, unknown>} */ (item);
    const quantity = Number(row.quantity);
    if (!isQuantity(quantity)) throw new ApiError("Unexpected cart item.", 500);
    return { product: asProduct(row.product), quantity };
  });
  return {
    items,
    totals: {
      subtotal: Number(totalsObj.subtotal) || 0,
      tax: Number(totalsObj.tax) || 0,
      total: Number(totalsObj.total) || 0,
    },
  };
}

/**
 * @param {unknown} data
 * @returns {UserProfile|null}
 */
function asUser(data) {
  if (!data || typeof data !== "object" || !("user" in data)) return null;
  const user = data.user;
  if (!user) return null;
  if (typeof user !== "object") throw new ApiError("Unexpected account.", 500);
  const row = /** @type {Record<string, unknown>} */ (user);
  if (typeof row.name !== "string" || typeof row.email !== "string") throw new ApiError("Unexpected account.", 500);
  return {
    name: row.name,
    email: row.email,
    street: String(row.street ?? ""),
    apartment: String(row.apartment ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    zip: String(row.zip ?? ""),
    phone: String(row.phone ?? ""),
  };
}

/**
 * @param {unknown} data
 * @returns {SavedCard[]}
 */
function asCards(data) {
  if (!data || typeof data !== "object" || !("cards" in data) || !Array.isArray(data.cards)) {
    throw new ApiError("Unexpected cards.", 500);
  }
  return data.cards.map((card) => {
    if (!card || typeof card !== "object") throw new ApiError("Unexpected card.", 500);
    const row = /** @type {Record<string, unknown>} */ (card);
    const id = Number(row.id);
    if (!Number.isInteger(id)) throw new ApiError("Unexpected card.", 500);
    return {
      id,
      brand: String(row.brand ?? "Card"),
      last4: String(row.last4 ?? ""),
      expiry: String(row.expiry ?? ""),
    };
  });
}

/**
 * @param {unknown} data
 * @returns {OrderRecord[]}
 */
function asOrders(data) {
  if (!data || typeof data !== "object" || !("orders" in data) || !Array.isArray(data.orders)) {
    throw new ApiError("Unexpected orders.", 500);
  }
  return data.orders.map((order) => {
    if (!order || typeof order !== "object") throw new ApiError("Unexpected order.", 500);
    const row = /** @type {Record<string, unknown>} */ (order);
    const payment = row.payment && typeof row.payment === "object" ? /** @type {Record<string, unknown>} */ (row.payment) : {};
    const items = Array.isArray(row.items) ? row.items.map((item) => {
      const line = item && typeof item === "object" ? /** @type {Record<string, unknown>} */ (item) : {};
      return { name: String(line.name ?? ""), quantity: Number(line.quantity) || 0 };
    }) : [];
    return {
      id: Number(row.id),
      email: String(row.email ?? ""),
      total: Number(row.total) || 0,
      createdAt: String(row.createdAt ?? ""),
      items,
      payment: { method: String(payment.method ?? ""), last4: payment.last4 ? String(payment.last4) : "" },
    };
  });
}

function setYear() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
}

/**
 * @param {string} id
 * @param {string|number} value
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function bindLogos() {
  document.querySelectorAll(".logo-img").forEach((node) => {
    if (!(node instanceof HTMLImageElement)) return;
    node.addEventListener("load", () => {
      if (node.nextElementSibling) node.nextElementSibling.classList.add("is-hidden");
    });
    node.addEventListener("error", () => node.classList.add("is-hidden"));
  });
}

async function loadCartCount() {
  try {
    const data = await fetchJSON("/B_getcartcount");
    const count = data && typeof data === "object" && "count" in data ? Number(data.count) : 0;
    setText("cart-count", Number.isFinite(count) ? count : 0);
  } catch (err) {
    console.error("Failed to load cart count", err);
  }
}

async function updateAuthLink() {
  const link = document.getElementById("nav-auth-link");
  if (!(link instanceof HTMLAnchorElement)) return;
  try {
    const user = asUser(await fetchJSON("/B_session"));
    document.body.classList.toggle("is-signed-in", Boolean(user));
    if (user) {
      const first = user.name.trim().split(/\s+/)[0] || "Account";
      link.textContent = first + " (Log out)";
      link.href = "#";
      link.onclick = null;
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await fetchJSON("/B_logout", { method: "POST" });
        } finally {
          window.location.reload();
        }
      }, { once: true });
      return;
    }
  } catch (err) {
    console.warn("Could not load session", err);
  }
  document.body.classList.remove("is-signed-in");
  link.textContent = "Login";
  link.href = "/login";
}

/**
 * @param {Product} product
 * @returns {string}
 */
function productCard(product) {
  return (
    '<div class="product-card">' +
    '<img src="' + escapeHTML(product.B_img) + '" alt="' + escapeHTML(product.B_name) + '" class="product-image" />' +
    '<h3 class="product-name">' + escapeHTML(product.B_name) + "</h3>" +
    '<p class="product-desc">' + escapeHTML(product.B_desc) + "</p>" +
    '<p class="product-price">$' + product.B_price.toFixed(2) + "</p>" +
    '<button class="add-to-cart-btn" data-id="' + product.id + '">Add to Cart</button>' +
    "</div>"
  );
}

async function loadProductsPage() {
  const container = document.getElementById("products-container");
  if (!(container instanceof HTMLElement)) return;
  const grid = container;
  const form = document.getElementById("product-search");
  const input = document.getElementById("animal-search");

  /**
   * @param {string} name
   */
  async function render(name) {
    const query = name.trim().slice(0, 40);
    const url = query ? "/B_getproducts?name=" + encodeURIComponent(query) : "/B_getproducts";
    const products = asProducts(await fetchJSON(url));
    grid.innerHTML = products.length
      ? products.map(productCard).join("")
      : "<p>No animals found.</p>";
  }

  try {
    await render(input instanceof HTMLInputElement ? input.value : "");
  } catch (_err) {
    grid.innerHTML = "<p>Failed to load products.</p>";
  }

  if (form instanceof HTMLFormElement && input instanceof HTMLInputElement) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await render(input.value);
      } catch (_err) {
        grid.innerHTML = "<p>Failed to load products.</p>";
      }
    });
  }

  container.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest(".add-to-cart-btn");
    if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
    const id = Number(btn.dataset.id);
    if (!Number.isInteger(id)) return;
    btn.disabled = true;
    try {
      await fetchJSON("/B_addtocart", { method: "POST", body: JSON.stringify({ id, quantity: 1 }) });
      await loadCartCount();
      btn.textContent = "Added!";
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not add to cart.");
    } finally {
      window.setTimeout(() => {
        btn.textContent = "Add to Cart";
        btn.disabled = false;
      }, 800);
    }
  });
}

/**
 * @param {Totals|null} totals
 */
function renderTotals(totals) {
  const values = totals || { subtotal: 0, tax: 0, total: 0 };
  setText("subtotal", values.subtotal.toFixed(2));
  setText("tax", values.tax.toFixed(2));
  setText("total", values.total.toFixed(2));
}

/**
 * @param {{ items: CartItem[], totals: Totals }} data
 */
function renderCartItems(data) {
  const container = document.getElementById("cart-items");
  if (!(container instanceof HTMLElement)) return;
  const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
  setText("item-count-text", totalItems + " " + (totalItems === 1 ? "item" : "items"));
  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn instanceof HTMLButtonElement) checkoutBtn.disabled = data.items.length === 0;
  if (!data.items.length) {
    container.innerHTML = "<p class=\"empty-note\">Your cart is empty.</p>";
    renderTotals(null);
    return;
  }
  container.innerHTML = data.items.map(({ product, quantity }) => (
    '<div class="cart-item">' +
    '<img src="' + escapeHTML(product.B_img) + '" alt="' + escapeHTML(product.B_name) + '" class="cart-item-image" />' +
    '<div class="cart-item-info"><h3>' + escapeHTML(product.B_name) + "</h3><p>$" + product.B_price.toFixed(2) + "</p></div>" +
    '<div class="cart-item-actions"><span class="cart-item-total">$' + (product.B_price * quantity).toFixed(2) + "</span>" +
    '<input type="number" min="1" max="20" value="' + quantity + '" data-id="' + product.id + '" class="cart-qty" aria-label="Quantity for ' + escapeHTML(product.B_name) + '" />' +
    '<button class="remove-item-btn" data-id="' + product.id + '">Remove</button></div></div>'
  )).join("");
  renderTotals(data.totals);
}

async function refreshCart() {
  renderCartItems(asCart(await fetchJSON("/B_getcartitems")));
  await loadCartCount();
}

async function loadCartPage() {
  const itemsContainer = document.getElementById("cart-items");
  if (!(itemsContainer instanceof HTMLElement)) return;
  try {
    renderCartItems(asCart(await fetchJSON("/B_getcartitems")));
  } catch (_err) {
    itemsContainer.innerHTML = "<p>Failed to load cart.</p>";
    return;
  }
  itemsContainer.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains("cart-qty")) return;
    const id = Number(target.dataset.id);
    const quantity = Number(target.value.trim());
    try {
      if (isQuantity(quantity)) {
        await fetchJSON("/B_updateQuantity", { method: "PUT", body: JSON.stringify({ id, quantity }) });
      }
    } catch (err) {
      console.error("Update qty failed", err);
    }
    try {
      await refreshCart();
    } catch (err) {
      console.error("Refresh failed", err);
    }
  });
  itemsContainer.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest(".remove-item-btn");
    if (!(btn instanceof HTMLButtonElement)) return;
    try {
      await fetchJSON("/B_removefromcart", { method: "DELETE", body: JSON.stringify({ id: Number(btn.dataset.id) }) });
      await refreshCart();
    } catch (err) {
      console.error("Remove failed", err);
    }
  });
  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn instanceof HTMLButtonElement) {
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "/checkout";
    });
  }
}

/**
 * @param {string} message
 */
function showFormError(message) {
  const box = document.getElementById("form-error");
  if (box instanceof HTMLElement) {
    box.textContent = message;
    box.hidden = !message;
    if (message) box.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (message) {
    window.alert(message);
  }
}

/**
 * @param {SavedCard[]} cards
 */
function renderSavedCards(cards) {
  const list = document.getElementById("saved-card-list");
  if (!(list instanceof HTMLElement)) return;
  if (!cards.length) {
    list.innerHTML = "";
    list.classList.add("is-hidden");
    return;
  }
  list.classList.remove("is-hidden");
  const choices = cards.map((card) => (
    '<label class="saved-card-choice"><input type="radio" name="cardChoice" value="saved-' + card.id + '" />' +
    "<span>" + escapeHTML(card.brand) + " ending in " + escapeHTML(card.last4) + " · " + escapeHTML(card.expiry) + "</span></label>"
  )).join("");
  list.innerHTML = choices + '<label class="saved-card-choice"><input type="radio" name="cardChoice" value="new" checked /><span>Use a new card</span></label>';
}

function syncCardFields() {
  const form = document.getElementById("checkout-form");
  const details = document.getElementById("new-card-fields");
  if (!(form instanceof HTMLFormElement) || !(details instanceof HTMLElement)) return;
  const method = form.querySelector('input[name="paymentMethod"]:checked');
  const choice = form.querySelector('input[name="cardChoice"]:checked');
  const paypal = method instanceof HTMLInputElement && method.value === "paypal";
  const saved = choice instanceof HTMLInputElement && choice.value.startsWith("saved-");
  const cardBox = document.getElementById("card-details");
  if (cardBox instanceof HTMLElement) cardBox.classList.toggle("is-hidden", paypal);
  details.classList.toggle("is-hidden", paypal || saved);
}

async function loadCheckoutPage() {
  const form = document.getElementById("checkout-form");
  if (!(form instanceof HTMLFormElement)) return;
  let user = null;
  try {
    user = asUser(await fetchJSON("/B_session"));
  } catch (err) {
    console.error("Checkout guard failed", err);
    showFormError("Could not verify your session. Please refresh the page.");
    return;
  }
  if (!user) {
    window.location.href = "/login?next=/checkout";
    return;
  }
  const emailInput = document.getElementById("email");
  if (emailInput instanceof HTMLInputElement && !emailInput.value) emailInput.value = user.email;
  const parts = user.name.trim().split(/\s+/);
  const first = document.getElementById("firstName");
  const last = document.getElementById("lastName");
  if (first instanceof HTMLInputElement && !first.value) first.value = parts[0] || "";
  if (last instanceof HTMLInputElement && !last.value) last.value = parts.slice(1).join(" ");
  const address = document.getElementById("address");
  const apartment = document.getElementById("apartment");
  const city = document.getElementById("city");
  const state = document.getElementById("state");
  const zip = document.getElementById("zip");
  const phone = document.getElementById("phone");
  if (address instanceof HTMLInputElement && !address.value) address.value = user.street;
  if (apartment instanceof HTMLInputElement && !apartment.value) apartment.value = user.apartment;
  if (city instanceof HTMLInputElement && !city.value) city.value = user.city;
  if (state instanceof HTMLInputElement && !state.value) state.value = user.state;
  if (zip instanceof HTMLInputElement && !zip.value) zip.value = user.zip;
  if (phone instanceof HTMLInputElement && !phone.value) phone.value = user.phone;

  try {
    const data = asCart(await fetchJSON("/B_getcartitems"));
    renderTotals(data.totals);
    const list = document.getElementById("checkout-items");
    if (list instanceof HTMLElement) {
      list.innerHTML = data.items.map(({ product, quantity }) => (
        '<div class="checkout-item">' +
        '<img src="' + escapeHTML(product.B_img) + '" alt="' + escapeHTML(product.B_name) + '" class="checkout-item-image" />' +
        '<div class="checkout-item-details"><h4>' + escapeHTML(product.B_name) + "</h4><p>Qty: " + quantity + " × $" + product.B_price.toFixed(2) + "</p></div>" +
        '<span class="checkout-item-price">$' + (product.B_price * quantity).toFixed(2) + "</span></div>"
      )).join("");
    }
  } catch (err) {
    console.error("Failed to load checkout summary", err);
  }

  try {
    renderSavedCards(asCards(await fetchJSON("/B_getcards")));
  } catch (err) {
    console.error("Failed to load saved cards", err);
  }

  form.querySelectorAll('input[name="paymentMethod"], input[name="cardChoice"]').forEach((node) => {
    node.addEventListener("change", syncCardFields);
  });
  syncCardFields();

  const cardInput = document.getElementById("cardNumber");
  if (cardInput instanceof HTMLInputElement) {
    cardInput.addEventListener("input", () => {
      const digits = cardInput.value.replace(/\D/g, "").slice(0, 19);
      cardInput.value = digits.replace(/(.{4})(?=.)/g, "$1 ");
    });
  }
  const expiryInput = document.getElementById("expiry");
  if (expiryInput instanceof HTMLInputElement) {
    expiryInput.addEventListener("input", () => {
      const digits = expiryInput.value.replace(/\D/g, "").slice(0, 4);
      expiryInput.value = digits.length > 2 ? digits.slice(0, 2) + " / " + digits.slice(2) : digits;
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showFormError("");
    const submitBtn = form.querySelector(".place-order-btn");
    if (!(submitBtn instanceof HTMLButtonElement) || submitBtn.disabled) return;
    submitBtn.disabled = true;
    const fd = new FormData(form);
    const paymentMethod = String(fd.get("paymentMethod") || "card");
    const choice = String(fd.get("cardChoice") || "new");
    /** @type {Record<string, unknown>} */
    const customerInfo = {
      name: (String(fd.get("firstName") || "") + " " + String(fd.get("lastName") || "")).trim(),
      email: String(fd.get("email") || ""),
      address: String(fd.get("address") || ""),
      apartment: String(fd.get("apartment") || ""),
      city: String(fd.get("city") || ""),
      state: String(fd.get("state") || ""),
      zip: String(fd.get("zip") || ""),
      phone: String(fd.get("phone") || ""),
      paymentMethod,
    };
    if (!isEmail(String(customerInfo.email))) {
      showFormError("Enter a valid email address.");
      submitBtn.disabled = false;
      return;
    }
    if (paymentMethod === "card") {
      if (choice.startsWith("saved-")) {
        customerInfo.savedCardId = Number(choice.slice(6));
      } else {
        const cardNumber = String(fd.get("cardNumber") || "");
        const expiry = String(fd.get("expiry") || "");
        const cvv = String(fd.get("cvv") || "");
        if (!isCardNumber(cardNumber) || !/^\d{2}\s*\/\s*\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
          showFormError("Enter a valid card number, expiration, and security code.");
          submitBtn.disabled = false;
          return;
        }
        customerInfo.cardNumber = cardNumber;
        customerInfo.expiry = expiry;
        customerInfo.cvv = cvv;
        customerInfo.saveCard = fd.get("saveCard") === "on";
      }
    }
    try {
      const result = await fetchJSON("/B_checkout", { method: "POST", body: JSON.stringify({ customerInfo }) });
      const order = result && typeof result === "object" && "order" in result ? result.order : null;
      const id = order && typeof order === "object" && "id" in order ? Number(order.id) : NaN;
      if (!Number.isInteger(id)) throw new ApiError("Checkout did not return an order.", 500);
      window.location.href = "/confirmation?id=" + encodeURIComponent(String(id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/login?next=/checkout";
        return;
      }
      showFormError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  bindLogos();
  loadCartCount();
  updateAuthLink();
  const page = document.body.dataset.page;
  if (page === "products") loadProductsPage();
  if (page === "cart") loadCartPage();
  if (page === "checkout") loadCheckoutPage();
});
