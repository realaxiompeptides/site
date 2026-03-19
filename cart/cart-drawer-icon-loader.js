document.addEventListener("DOMContentLoaded", async function () {
  const mount = document.getElementById("cartTriggerMount");
  if (!mount) return;

  const path = window.location.pathname;
  const isNestedPage = /\/[^/]+\/[^/]+\.html?$/.test(path);

  const iconFile = isNestedPage
    ? "../cart/cart-drawer-icon.html"
    : "cart/cart-drawer-icon.html";

  async function loadIcon() {
    try {
      const response = await fetch(iconFile, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${iconFile}`);
      }

      const html = await response.text();
      mount.innerHTML = html;
      syncCartCount();
    } catch (error) {
      console.error("Cart drawer icon load failed:", error);
    }
  }

  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem("axiom_cart") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse axiom_cart:", error);
      return [];
    }
  }

  function syncCartCount() {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;

    const cart = getCart();
    const total = cart.reduce((sum, item) => {
      return sum + Number(item.quantity || item.qty || 0);
    }, 0);

    countEl.textContent = String(total);
  }

  await loadIcon();

  window.addEventListener("axiom-cart-updated", syncCartCount);
  window.addEventListener("storage", syncCartCount);
});
