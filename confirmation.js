async function loadOrderSummary() {
  const id = new URLSearchParams(window.location.search).get("id");
  const container = document.getElementById("order-details");
  if (!(container instanceof HTMLElement)) return;
  const heading = byId("order-status-heading");
  const message = byId("order-status-message");
  const detail = byId("order-status-detail");
  const note = byId("order-note").querySelector("p");
  const icon = byId("success-icon");

  /**
   * @param {string} text
   */
  const unavailable = (text) => {
    icon.classList.add("is-hidden");
    heading.textContent = "Order Not Confirmed";
    message.textContent = text;
    detail.textContent = "Please check your order history or try again.";
    if (note) note.textContent = "We could not verify this order.";
    container.innerHTML = "<h3>Order Summary</h3><p>Order details are unavailable.</p>";
  };

  if (!id || !/^\d+$/.test(id)) {
    unavailable("We could not find an order to display.");
    return;
  }

  try {
    const orders = asOrders(await fetchJSON("/B_getorders?id=" + encodeURIComponent(id)));
    const order = orders[0];
    if (!order || String(order.id) !== id) {
      unavailable("We could not find that order.");
      return;
    }
    const lines = order.items.map((item) => "<p>" + escapeHTML(item.name) + " × " + Number(item.quantity) + "</p>").join("");
    const payment = order.payment.method === "card" && order.payment.last4
      ? "Card ending in " + escapeHTML(order.payment.last4)
      : "PayPal";
    container.innerHTML =
      "<h3>Order Summary</h3>" +
      "<p><strong>Order #:</strong> " + Number(order.id) + "</p>" +
      lines +
      "<p><strong>Total:</strong> $" + Number(order.total).toFixed(2) + "</p>" +
      "<p><strong>Payment:</strong> " + payment + "</p>" +
      "<p><strong>Email:</strong> " + escapeHTML(order.email) + "</p>";
    icon.classList.remove("is-hidden");
    heading.textContent = "Order Confirmed!";
    message.textContent = "Thank you for your purchase!";
    detail.textContent = "Your exotic pets are on their way to their new home.";
    if (note) note.textContent = "Your order summary is saved to your account.";
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    console.error("Failed to load order summary", err);
    unavailable("We could not retrieve your order details.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const shop = document.getElementById("continue-shopping");
  const printBtn = document.getElementById("print-receipt");
  if (shop) shop.addEventListener("click", () => { window.location.href = "/"; });
  if (printBtn) printBtn.addEventListener("click", () => { window.print(); });
  loadOrderSummary();
});
