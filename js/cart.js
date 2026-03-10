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
    cartToggle?.setAttribute("aria-expanded", "true");
    cartDrawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    if (!cartDrawer || !overlay) return;
    cartDrawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    cartToggle?.setAttribute("aria-expanded", "false");
    cartDrawer.setAttribute("aria-hidden", "true");
  }

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);

  window.closeCartDrawer = closeCart;
});
