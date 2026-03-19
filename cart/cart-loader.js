document.addEventListener("DOMContentLoaded", function () {
  const mount = document.getElementById("cart-drawer-mount");
  if (!mount) return;

  let cartPath = "cart/cart-drawer.html";
  const isProductPage = window.location.pathname.includes("/product-page/");

  if (isProductPage) {
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

      const browseProductsLink = mount.querySelector(".cart-empty-state a");
      const viewCartLink = mount.querySelector('.cart-action-stack a[href*="cart-page"]');
      const checkoutLink = mount.querySelector('.cart-action-stack a[href*="checkout"]');

      if (browseProductsLink) {
        browseProductsLink.setAttribute(
          "href",
          isProductPage ? "../catalog.html" : "catalog.html"
        );
      }

      if (viewCartLink) {
        viewCartLink.setAttribute(
          "href",
          isProductPage ? "../cart-page/cart.html" : "cart/cart-page.html"
        );
      }

      if (checkoutLink) {
        checkoutLink.setAttribute(
          "href",
          isProductPage ? "../checkout/checkout.html" : "checkout/checkout.html"
        );
      }

      document.dispatchEvent(new CustomEvent("cartDrawerLoaded"));
    })
    .catch(function (error) {
      console.error("Cart drawer failed to load:", error);
    });
});
