document.addEventListener("DOMContentLoaded", function () {

  const mount = document.getElementById("cart-drawer-mount");
  if (!mount) return;

  let cartPath = "cart/cart-drawer.html";

  // If page is inside a folder (like /product-page/)
  if (window.location.pathname.includes("/product-page/")) {
    cartPath = "../cart/cart-drawer.html";
  }

  fetch(cartPath)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load cart drawer");
      }
      return response.text();
    })
    .then(function (html) {
      mount.innerHTML = html;

      // notify cart.js drawer is ready
      document.dispatchEvent(new CustomEvent("cartDrawerLoaded"));
    })
    .catch(function (error) {
      console.error("Cart drawer failed to load:", error);
    });

});
