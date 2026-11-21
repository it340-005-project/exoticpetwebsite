/**
 * @param {string} next
 */
function requireLogin(next) {
  window.location.href = "/login?next=" + encodeURIComponent(next);
}

async function loadOrdersPage() {
  const list = document.getElementById("order-list");
  if (!(list instanceof HTMLElement)) return;
  try {
    const user = asUser(await fetchJSON("/B_session"));
    if (!user) {
      requireLogin("/orders");
      return;
    }
    const orders = asOrders(await fetchJSON("/B_getorders"));
    if (!orders.length) {
      list.innerHTML = '<p class="empty-note">You have no orders yet.</p><a href="/">Browse animals</a>';
      return;
    }
    list.innerHTML = orders.map((order) => {
      const when = order.createdAt ? new Date(order.createdAt).toLocaleString() : "";
      const items = order.items.map((item) => escapeHTML(item.name) + " × " + item.quantity).join(", ");
      const pay = order.payment.method === "card" && order.payment.last4
        ? escapeHTML(order.payment.method) + " " + escapeHTML(order.payment.last4)
        : "PayPal";
      return '<article class="order-row"><div><a href="/confirmation?id=' + encodeURIComponent(String(order.id)) + '">Order #' + order.id + "</a>" +
        "<p>" + escapeHTML(when) + "</p><p>" + items + "</p><p>" + pay + "</p></div>" +
        "<strong>$" + order.total.toFixed(2) + "</strong></article>";
    }).join("");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      requireLogin("/orders");
      return;
    }
    list.innerHTML = "<p>Failed to load orders.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadOrdersPage);
