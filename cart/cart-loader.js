document.addEventListener("DOMContentLoaded", function () {
  const cartMount = document.getElementById("cart-drawer-mount");
  if (!cartMount) return;

  fetch("cart/cart-drawer.html")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load cart/cart-drawer.html");
      }
      return response.text();
    })
    .then(function (html) {
      cartMount.innerHTML = html;

      const event = new CustomEvent("cartDrawerLoaded");
      document.dispatchEvent(event);
    })
    .catch(function (error) {
      console.error("Cart drawer load failed:", error);
    });
});
