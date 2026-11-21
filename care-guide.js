document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".care-filter-btn").forEach((node) => {
    node.addEventListener("click", () => {
      if (!(node instanceof HTMLButtonElement)) return;
      const category = node.dataset.cat || "all";
      document.querySelectorAll(".care-filter-btn").forEach((btn) => btn.classList.remove("active"));
      node.classList.add("active");
      document.querySelectorAll(".care-card").forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        const match = category === "all" || card.dataset.cat === category;
        card.classList.toggle("is-hidden", !match);
      });
    });
  });
});
