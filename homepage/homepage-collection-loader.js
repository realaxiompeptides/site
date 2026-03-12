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

      if (!grid) {
        console.error("homepageCollectionGrid not found");
        return;
      }

      if (!products.length) {
        console.error("No homepage products found in HOMEPAGE_COLLECTION_PRODUCTS");
        return;
      }

      grid.innerHTML = products.map(function (product) {
        return `
          <article class="homepage-product-card">
            <div class="homepage-product-image-wrap">
              <span class="homepage-product-badge">${product.badge || ""}</span>
              <img src="${product.image}" alt="${product.name}">
            </div>

            <div class="homepage-product-card-body">
              <h3 class="homepage-product-title">${product.name}</h3>
              <p class="homepage-product-price">${product.price}</p>
              <a href="${product.link}" class="homepage-product-button">${product.buttonText || "View Product"}</a>
            </div>
          </article>
        `;
      }).join("");
    })
    .catch(function (error) {
      console.error("Homepage collection failed to load:", error);
    });
});
