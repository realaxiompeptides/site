document.addEventListener("DOMContentLoaded", async function () {
  const cartTriggerMount = document.getElementById("cartTriggerMount");
  if (!cartTriggerMount) return;

  async function loadCartDrawerIcon() {
    try {
      const response = await fetch("../cart/cart-drawer-icon.html", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load cart drawer icon: ${response.status}`);
      }

      cartTriggerMount.innerHTML = await response.text();
      updateCartCount();
    } catch (error) {
      console.error("Cart drawer icon load failed:", error);
    }
  }

  function updateCartCount() {
    const cartCount = document.getElementById("cartCount");
    if (!cartCount) return;

    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem("axiom_cart")) || [];
    } catch (error) {
      console.error("Failed to parse axiom_cart", error);
      cart = [];
    }

    const totalItems = cart.reduce(function (sum, item) {
      return sum + (Number(item.quantity) || 0);
    }, 0);

    cartCount.textContent = String(totalItems);
  }

  await loadCartDrawerIcon();

  window.addEventListener("axiom-cart-updated", updateCartCount);
  document.addEventListener("axiom-cart-updated", updateCartCount);
  window.addEventListener("storage", updateCartCount);
});
