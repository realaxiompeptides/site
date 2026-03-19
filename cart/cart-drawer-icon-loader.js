document.addEventListener("DOMContentLoaded", async function () {
  const cartTriggerMount =
    document.getElementById("cartTriggerMount") ||
    document.getElementById("cartDrawerIconMount");

  if (!cartTriggerMount) return;

  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const currentFile = pathSegments[pathSegments.length - 1] || "";
  const isNestedPage =
    pathSegments.length > 1 &&
    currentFile.endsWith(".html");

  const iconPath = isNestedPage
    ? "../cart/cart-drawer-icon.html"
    : "cart/cart-drawer-icon.html";

  async function loadCartDrawerIcon() {
    try {
      const response = await fetch(iconPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load cart drawer icon: ${response.status}`);
      }

      const html = await response.text();
      cartTriggerMount.innerHTML = html;
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
      return sum + Number(item.quantity || item.qty || 0);
    }, 0);

    cartCount.textContent = String(totalItems);
  }

  await loadCartDrawerIcon();

  window.addEventListener("axiom-cart-updated", updateCartCount);
  document.addEventListener("axiom-cart-updated", updateCartCount);
  window.addEventListener("storage", updateCartCount);
});
