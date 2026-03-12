document.addEventListener("DOMContentLoaded", () => {
  const filterToggle = document.querySelector(".filter-toggle");
  const sidebar = document.getElementById("catalogSidebar");
  const sortSelect = document.getElementById("sortProducts");
  const catalogGrid = document.getElementById("catalogGrid");
  const priceRange = document.getElementById("priceRange");

  if (filterToggle && sidebar) {
    filterToggle.addEventListener("click", () => {
      if (window.innerWidth <= 899) {
        sidebar.classList.toggle("active");
      }
    });
  }

  if (!catalogGrid) return;

  const products = [
    {
      name: "BPC-157",
      price: 45,
      oldPrice: 55,
      image: "images/bpc157.PNG",
      badge: "SALE",
      category: "peptides",
      inStock: true,
      featured: true,
      createdAt: 3
    },
    {
      name: "TB-500",
      price: 45,
      oldPrice: 65,
      image: "images/tb500.PNG",
      badge: "SALE",
      category: "peptides",
      inStock: true,
      featured: true,
      createdAt: 2
    },
    {
      name: "GHK-CU",
      price: 35,
      oldPrice: 40,
      image: "images/ghkcu.PNG",
      badge: "SALE",
      category: "research",
      inStock: true,
      featured: true,
      createdAt: 4
    },
    {
      name: "BAC Water",
      price: 20,
      oldPrice: null,
      image: "images/bacwater.PNG",
      badge: "SALE",
      category: "supplies",
      inStock: true,
      featured: false,
      createdAt: 1
    }
  ];

  function getCheckedCategories() {
    return [...document.querySelectorAll('.catalog-sidebar input[type="checkbox"][value]:checked')]
      .map(input => input.value);
  }

  function onlyAvailabilityChecked() {
    const stockCheckbox = [...document.querySelectorAll('.catalog-sidebar input[type="checkbox"]')]
      .find(input => !input.value);
    return stockCheckbox ? stockCheckbox.checked : false;
  }

  function buildCard(product) {
    return `
      <a href="product.html" class="catalog-card">
        <div class="catalog-image">
          ${product.badge ? `<span class="catalog-badge">${product.badge}</span>` : ""}
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="catalog-info">
          <h3>${product.name}</h3>
          <div class="catalog-price-wrap">
            ${product.oldPrice ? `<span class="catalog-old-price">$${product.oldPrice.toFixed(2)}</span>` : ""}
            <span class="catalog-price">$${product.price.toFixed(2)}</span>
          </div>
          <button class="catalog-btn">View Product</button>
        </div>
      </a>
    `;
  }

  function renderProducts() {
    let filtered = [...products];

    const selectedCategories = getCheckedCategories();
    const stockOnly = onlyAvailabilityChecked();
    const maxPrice = priceRange ? Number(priceRange.value) : 200;
    const sortValue = sortSelect ? sortSelect.value : "featured";

    if (selectedCategories.length) {
      filtered = filtered.filter(product => selectedCategories.includes(product.category));
    }

    if (stockOnly) {
      filtered = filtered.filter(product => product.inStock);
    }

    filtered = filtered.filter(product => product.price <= maxPrice);

    if (sortValue === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortValue === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortValue === "newest") {
      filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    if (!filtered.length) {
      catalogGrid.innerHTML = `<div class="catalog-empty">No products matched your filters.</div>`;
      return;
    }

    catalogGrid.innerHTML = filtered.map(buildCard).join("");
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderProducts);
  }

  if (priceRange) {
    priceRange.addEventListener("input", renderProducts);
  }

  document.querySelectorAll('.catalog-sidebar input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", renderProducts);
  });

  renderProducts();
});
