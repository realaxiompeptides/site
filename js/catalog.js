document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.getElementById("catalogProductGrid");
  const resultsCount = document.getElementById("catalogResultsText");
  const sortSelect = document.getElementById("catalogSort");
  const inStockOnly = document.getElementById("inStockOnly");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const clearFiltersBtn = document.getElementById("clearFilters");

  const categoryCheckboxes = document.querySelectorAll('input[name="category"]');

  if (!productGrid) return;

  const products = [
    {
      id: 1,
      name: "BPC-157",
      price: 45,
      oldPrice: 55,
      image: "images/bpc-157.PNG",
      category: "peptides",
      inStock: true,
      badge: "SALE",
      url: "product-bpc-157.html"
    },
    {
      id: 2,
      name: "TB-500",
      price: 45,
      oldPrice: 65,
      image: "images/tb-500.PNG",
      category: "peptides",
      inStock: true,
      badge: "SALE",
      url: "product-tb-500.html"
    },
    {
      id: 3,
      name: "GHK-CU",
      price: 35,
      oldPrice: 40,
      image: "images/ghk-cu.PNG",
      category: "research-compounds",
      inStock: true,
      badge: "SALE",
      url: "product-ghk-cu.html"
    },
    {
      id: 4,
      name: "BAC Water",
      price: 20,
      oldPrice: null,
      image: "images/bac-water.PNG",
      category: "supplies",
      inStock: true,
      badge: "SALE",
      url: "product-bac-water.html"
    }
  ];

  function formatPrice(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function getSelectedCategories() {
    return Array.from(categoryCheckboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
  }

  function renderProducts(items) {
    if (!items.length) {
      productGrid.innerHTML = `
        <div class="catalog-empty-state">
          <h3>No products found</h3>
          <p>Try changing your filters or clearing them.</p>
        </div>
      `;
      if (resultsCount) resultsCount.textContent = "Showing 0 products";
      return;
    }

    productGrid.innerHTML = items.map((product) => {
      return `
        <article class="catalog-product-card">
          <div class="catalog-product-image-wrap">
            <span class="catalog-product-badge">${product.badge || "SALE"}</span>
            <img src="${product.image}" alt="${product.name}" />
          </div>

          <div class="catalog-product-card-body">
            <h3 class="catalog-product-title">${product.name}</h3>

            <div class="catalog-product-price-block">
              ${product.oldPrice ? `<span class="catalog-product-old-price">${formatPrice(product.oldPrice)}</span>` : ""}
              <span class="catalog-product-price">${formatPrice(product.price)}</span>
            </div>

            <a href="${product.url}" class="catalog-product-button">View Product</a>
          </div>
        </article>
      `;
    }).join("");

    if (resultsCount) {
      resultsCount.textContent = `Showing ${items.length} product${items.length === 1 ? "" : "s"}`;
    }
  }

  function applyFilters() {
    let filtered = [...products];

    const selectedCategories = getSelectedCategories();
    const minPrice = parseFloat(minPriceInput?.value || "");
    const maxPrice = parseFloat(maxPriceInput?.value || "");
    const stockOnly = inStockOnly?.checked;
    const sortValue = sortSelect?.value || "featured";

    if (selectedCategories.length) {
      filtered = filtered.filter(product => selectedCategories.includes(product.category));
    }

    if (!Number.isNaN(minPrice)) {
      filtered = filtered.filter(product => product.price >= minPrice);
    }

    if (!Number.isNaN(maxPrice)) {
      filtered = filtered.filter(product => product.price <= maxPrice);
    }

    if (stockOnly) {
      filtered = filtered.filter(product => product.inStock);
    }

    switch (sortValue) {
      case "price-low-high":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high-low":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name-a-z":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-z-a":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    renderProducts(filtered);
  }

  categoryCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", applyFilters);
  });

  if (inStockOnly) inStockOnly.addEventListener("change", applyFilters);
  if (minPriceInput) minPriceInput.addEventListener("input", applyFilters);
  if (maxPriceInput) maxPriceInput.addEventListener("input", applyFilters);
  if (sortSelect) sortSelect.addEventListener("change", applyFilters);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      categoryCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });

      if (inStockOnly) inStockOnly.checked = false;
      if (minPriceInput) minPriceInput.value = "";
      if (maxPriceInput) maxPriceInput.value = "";
      if (sortSelect) sortSelect.value = "featured";

      applyFilters();
    });
  }

  applyFilters();
});
