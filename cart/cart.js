function setupCartDrawer() {
  const cartToggle = document.getElementById("cartToggle");
  const cartClose = document.getElementById("cartClose");
  const cartDrawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("siteOverlay");

  if (!cartToggle || !cartDrawer || !overlay) return;

  function openCart() {
    cartDrawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    cartToggle.setAttribute("aria-expanded", "true");
    cartDrawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    cartDrawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    cartToggle.setAttribute("aria-expanded", "false");
    cartDrawer.setAttribute("aria-hidden", "true");
  }

  cartToggle.addEventListener("click", openCart);

  if (cartClose) {
    cartClose.addEventListener("click", closeCart);
  }

  overlay.addEventListener("click", closeCart);

  window.closeCartDrawer = closeCart;
}

document.addEventListener("DOMContentLoaded", setupCartDrawer);
document.addEventListener("cartDrawerLoaded", setupCartDrawer);
