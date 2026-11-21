async function loadPaymentMethods() {
  const list = document.getElementById("method-list");
  if (!(list instanceof HTMLElement)) return;
  try {
    const user = asUser(await fetchJSON("/B_session"));
    if (!user) {
      window.location.href = "/login?next=" + encodeURIComponent("/payment-methods");
      return;
    }
    const cards = asCards(await fetchJSON("/B_getcards"));
    if (!cards.length) {
      list.innerHTML = '<p class="empty-note">No saved cards yet. You can save one during checkout.</p>';
      return;
    }
    list.innerHTML = cards.map((card) => (
      '<article class="method-row"><div><strong>' + escapeHTML(card.brand) + "</strong>" +
      "<p>Ending in " + escapeHTML(card.last4) + " · " + escapeHTML(card.expiry) + "</p></div>" +
      '<button class="text-button" type="button" data-remove="' + card.id + '">Remove</button></article>'
    )).join("");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = "/login?next=" + encodeURIComponent("/payment-methods");
      return;
    }
    list.innerHTML = "<p>Failed to load payment methods.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("method-list");
  if (list) {
    list.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement) || !target.dataset.remove) return;
      const id = Number(target.dataset.remove);
      if (!Number.isInteger(id)) return;
      try {
        await fetchJSON("/B_removecard", { method: "DELETE", body: JSON.stringify({ id }) });
        await loadPaymentMethods();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Could not remove that card.");
      }
    });
  }
  loadPaymentMethods();
});
