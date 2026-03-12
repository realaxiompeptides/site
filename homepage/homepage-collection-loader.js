document.addEventListener("DOMContentLoaded", function () {
  const mount = document.getElementById("homepage-collection-mount");
  if (!mount) return;

  fetch("homepage/homepage-collection.html")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load homepage/homepage-collection.html");
      }
      return response.text();
    })
    .then(function (html) {
      mount.innerHTML = html;

      const grid = document.getElementById("homepageCollectionGrid");
      const products = window.HOMEPAGE_COLLECTION_PRODUCTS || [];

      if (!grid || !products.length) return;

      grid.innerHTML = products.map(function (product) {
        return `
          <article class="homepage-product-card">
            <div class="homepage-product-image-wrap">
              ${product.badge ? `<span class="homepage-product-badge">${product.badge}</span>` : ""}
              <img src="${product.image}" alt="${product.name}">
            </div>

            <div class="homepage-product-card-body">
              <h3 class="homepage-product-title">${product.name}</h3>

              <div class="homepage-product-price-block">
                ${product.oldPrice ? `<span class="homepage-product-old-price">${product.oldPrice}</span>` : ""}
                <span class="homepage-product-price">${product.price}</span>
              </div>

              <a href="${product.link}" class="homepage-product-button">
                ${product.buttonText || "Shop Now"}
              </a>
            </div>
          </article>
        `;
      }).join("");
    })
    .catch(function (error) {
      console.error("Homepage collection failed to load:", error);
    });
});
