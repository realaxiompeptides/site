document.addEventListener("DOMContentLoaded", function () {
  const cartToggle = document.getElementById("cartToggle");
  const cartClose = document.getElementById("cartClose");
  const cartDrawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("siteOverlay");

  function openCart() {
    if (!cartDrawer || !overlay) return;

    cartDrawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    if (cartToggle) {
      cartToggle.setAttribute("aria-expanded", "true");
    }

    cartDrawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    if (!cartDrawer || !overlay) return;

    cartDrawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";

    if (cartToggle) {
      cartToggle.setAttribute("aria-expanded", "false");
    }

    cartDrawer.setAttribute("aria-hidden", "true");
  }

  if (cartToggle && !cartToggle.dataset.bound) {
    cartToggle.addEventListener("click", function (event) {
      event.preventDefault();
      openCart();
    });
    cartToggle.dataset.bound = "true";
  }

  if (cartClose && !cartClose.dataset.bound) {
    cartClose.addEventListener("click", function () {
      closeCart();
    });
    cartClose.dataset.bound = "true";
  }

  if (overlay && !overlay.dataset.cartBound) {
    overlay.addEventListener("click", function () {
      closeCart();
    });
    overlay.dataset.cartBound = "true";
  }

  if (!window.__axiomCartEscapeBound) {
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeCart();
      }
    });
    window.__axiomCartEscapeBound = true;
  }

  window.openCartDrawer = openCart;
  window.closeCartDrawer = closeCart;
});
