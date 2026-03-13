document.addEventListener("DOMContentLoaded", function () {
  const products = Array.isArray(window.AXIOM_PRODUCTS) ? window.AXIOM_PRODUCTS : [];

  const catalogGrid = document.getElementById("catalogGrid");
  const resultsText = document.getElementById("catalogResultsText");
  const sortSelect = document.getElementById("catalogSort");
  const filterToggle = document.getElementById("catalogFilterToggle");
  const sidebar = document.getElementById("catalogSidebar");
  const sidebarClose = document.getElementById("catalogSidebarClose");
  const clearBtn = document.getElementById("clearCatalogFilters");
  const categoryChecks = Array.from(document.querySelectorAll(".catalog-category-filter"));
  const inStockOnly = document.getElementById("inStockOnly");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");

  if (!catalogGrid || !resultsText) return;

  function getLowestPrice(product) {
    if (!product.variants || !product.variants.length) return 0;
    return Math.min(...product.variants.map(v => Number(v.price) || 0));
  }

  function getHighestPrice(product) {
    if (!product.variants || !product.variants.length) return 0;
    return Math.max(...product.variants.map(v => Number(v.price) || 0));
  }

  function getLowestCompareAt(product) {
    if (!product.variants || !product.variants.length) return null;
    const values = product.variants
      .map(v => Number(v.compareAtPrice))
      .filter(v => !Number.isNaN(v) && v > 0);

    return values.length ? Math.min(...values) : null;
  }

  function getHighestCompareAt(product) {
    if (!product.variants || !product.variants.length) return null;
    const values = product.variants
      .map(v => Number(v.compareAtPrice))
      .filter(v => !Number.isNaN(v) && v > 0);

    return values.length ? Math.max(...values) : null;
  }

  function hasInStockVariant(product) {
    return Array.isArray(product.variants) && product.variants.some(v => v.inStock);
  }

  function formatPriceRange(product) {
    const low = getLowestPrice(product);
    const high = getHighestPrice(product);

    if (low === high) {
      return `$${low.toFixed(2)}`;
    }

    return `$${low.toFixed(2)} – $${high.toFixed(2)}`;
  }

  function formatCompareRange(product) {
    const low = getLowestCompareAt(product);
    const high = getHighestCompareAt(product);

    if (low === null) return "";

    if (low === high) {
      return `$${low.toFixed(2)}`;
    }

    return `$${low.toFixed(2)} – $${high.toFixed(2)}`;
  }

  function getProductImage(product) {
    if (Array.isArray(product.images) && product.images.length) {
      return product.images[0];
    }
    return "images/products/placeholder.PNG";
  }

  function getSelectedCategories() {
    return categoryChecks
      .filter(check => check.checked)
      .map(check => check.value.trim().toLowerCase().replace(/\s+/g, "-"));
  }

  function filterProducts(items) {
    const selectedCategories = getSelectedCategories();
    const minPrice = minPriceInput && minPriceInput.value !== "" ? Number(minPriceInput.value) : null;
    const maxPrice = maxPriceInput && maxPriceInput.value !== "" ? Number(maxPriceInput.value) : null;
    const stockOnly = inStockOnly ? inStockOnly.checked : false;

    return items.filter(product => {
      const productCategory = (product.category || "").trim().toLowerCase();
      const lowPrice = getLowestPrice(product);
      const highPrice = getHighestPrice(product);

      if (selectedCategories.length && !selectedCategories.includes(productCategory)) {
        return false;
      }

      if (stockOnly && !hasInStockVariant(product)) {
        return false;
      }

      if (minPrice !== null && highPrice < minPrice) {
        return false;
      }

      if (maxPrice !== null && lowPrice > maxPrice) {
        return false;
      }

      return true;
    });
  }

  function sortProducts(items) {
    const sortValue = sortSelect ? sortSelect.value : "featured";
    const sorted = [...items];

    switch (sortValue) {
      case "price-low":
        sorted.sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
        break;
      case "price-high":
        sorted.sort((a, b) => getLowestPrice(b) - getLowestPrice(a));
        break;
      case "name-az":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-za":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "featured":
      default:
        break;
    }

    return sorted;
  }

  function productCardMarkup(product) {
    const image = getProductImage(product);
    const comparePrice = formatCompareRange(product);
    const price = formatPriceRange(product);
    const badge = product.badge || "SALE";
    const link = `product.html?slug=${encodeURIComponent(product.slug)}`;

    return `
      <article class="catalog-product-card">
        <div class="catalog-product-image-wrap">
          <span class="catalog-badge">${badge}</span>
          <img src="${image}" alt="${product.name}" loading="lazy" />
        </div>

        <div class="catalog-product-body">
          <h3 class="catalog-product-title">${product.name}</h3>

          <div class="catalog-product-price-wrap">
            ${comparePrice ? `<span class="catalog-product-old-price">${comparePrice}</span>` : ""}
            <span class="catalog-product-price">${price}</span>
          </div>

          <a href="${link}" class="catalog-product-button">View Product</a>
        </div>
      </article>
    `;
  }

  function renderProducts() {
    if (!products.length) {
      resultsText.textContent = "No products found.";
      catalogGrid.innerHTML = `
        <div class="catalog-empty">
          No products are available right now.
        </div>
      `;
      return;
    }

    const filtered = filterProducts(products);
    const sorted = sortProducts(filtered);

    if (!sorted.length) {
      resultsText.textContent = "No matching products";
      catalogGrid.innerHTML = `
        <div class="catalog-empty">
          No products match your current filters.
        </div>
      `;
      return;
    }

    resultsText.textContent =
      sorted.length === 1 ? "Showing 1 product" : `Showing ${sorted.length} products`;

    catalogGrid.innerHTML = sorted.map(productCardMarkup).join("");
  }

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("catalog-sidebar-open", "active");
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("catalog-sidebar-open", "active");
  }

  if (filterToggle) {
    filterToggle.addEventListener("click", openSidebar);
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderProducts);
  }

  categoryChecks.forEach(check => {
    check.addEventListener("change", renderProducts);
  });

  if (inStockOnly) {
    inStockOnly.addEventListener("change", renderProducts);
  }

  if (minPriceInput) {
    minPriceInput.addEventListener("input", renderProducts);
  }

  if (maxPriceInput) {
    maxPriceInput.addEventListener("input", renderProducts);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      categoryChecks.forEach(check => {
        check.checked = false;
      });

      if (inStockOnly) inStockOnly.checked = false;
      if (minPriceInput) minPriceInput.value = "";
      if (maxPriceInput) maxPriceInput.value = "";
      if (sortSelect) sortSelect.value = "featured";

      renderProducts();
      closeSidebar();
    });
  }

  renderProducts();
});
