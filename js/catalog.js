document.addEventListener("DOMContentLoaded", function () {
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

  let products = [];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeImagePath(path) {
    if (!path || typeof path !== "string") {
      return "images/products/placeholder.PNG";
    }

    const cleanPath = path.trim();

    if (
      cleanPath.startsWith("http://") ||
      cleanPath.startsWith("https://") ||
      cleanPath.startsWith("/") ||
      cleanPath.startsWith("./") ||
      cleanPath.startsWith("../")
    ) {
      return cleanPath;
    }

    return cleanPath;
  }

  function normalizeCategory(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\+/g, "plus")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function convertSupabaseProduct(product) {
    const variants = Array.isArray(product?.product_variants)
      ? product.product_variants
          .filter(function (variant) {
            return variant && variant.is_active !== false;
          })
          .sort(function (a, b) {
            return Number(a.sort_order || 0) - Number(b.sort_order || 0);
          })
          .map(function (variant) {
            return {
              id: variant.variant_id || variant.id || "",
              label: variant.label || "",
              price: Number(variant.price || 0),
              compareAtPrice: Number(variant.compare_at_price || 0),
              weightOz: Number(variant.weight_oz || 0),
              stockQuantity: Number(variant.stock_quantity || 0),
              allowBackorder: variant.allow_backorder === true,
              inStock:
                Number(variant.stock_quantity || 0) > 0 ||
                variant.allow_backorder === true,
              image: variant.image || ""
            };
          })
      : [];

    const images = [];
    if (product.main_image) {
      images.push(normalizeImagePath(product.main_image));
    }
    if (Array.isArray(product.gallery_images) && product.gallery_images.length) {
      product.gallery_images.forEach(function (image) {
        const normalized = normalizeImagePath(image);
        if (!images.includes(normalized)) {
          images.push(normalized);
        }
      });
    }

    return {
      id: product.id || "",
      slug: product.slug || "",
      name: product.name || "Product",
      badge: product.badge || "SALE",
      category: normalizeCategory(product.category || ""),
      categoryLabel: product.category || "",
      description: product.description || "",
      longDescription: product.long_description || "",
      image: product.main_image ? normalizeImagePath(product.main_image) : "",
      images: images.length ? images : ["images/products/placeholder.PNG"],
      variants: variants,
      sortOrder: Number(product.sort_order || 0),
      createdAt: product.created_at || ""
    };
  }

  async function fetchSupabaseProducts() {
    if (!window.axiomSupabase) {
      return null;
    }

    const { data, error } = await window.axiomSupabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        badge,
        category,
        description,
        long_description,
        main_image,
        gallery_images,
        is_active,
        sort_order,
        created_at,
        updated_at,
        product_variants (
          id,
          product_id,
          variant_id,
          label,
          price,
          compare_at_price,
          weight_oz,
          stock_quantity,
          image,
          allow_backorder,
          is_active,
          sort_order,
          created_at,
          updated_at
        )
      `)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load Supabase catalog products:", error);
      return null;
    }

    return Array.isArray(data) ? data.map(convertSupabaseProduct) : [];
  }

  function getLowestPrice(product) {
    if (!product.variants || !product.variants.length) return 0;
    return Math.min.apply(
      null,
      product.variants.map(function (variant) {
        return Number(variant.price) || 0;
      })
    );
  }

  function getHighestPrice(product) {
    if (!product.variants || !product.variants.length) return 0;
    return Math.max.apply(
      null,
      product.variants.map(function (variant) {
        return Number(variant.price) || 0;
      })
    );
  }

  function getLowestCompareAt(product) {
    if (!product.variants || !product.variants.length) return null;

    const values = product.variants
      .map(function (variant) {
        return Number(variant.compareAtPrice);
      })
      .filter(function (value) {
        return !Number.isNaN(value) && value > 0;
      });

    return values.length ? Math.min.apply(null, values) : null;
  }

  function getHighestCompareAt(product) {
    if (!product.variants || !product.variants.length) return null;

    const values = product.variants
      .map(function (variant) {
        return Number(variant.compareAtPrice);
      })
      .filter(function (value) {
        return !Number.isNaN(value) && value > 0;
      });

    return values.length ? Math.max.apply(null, values) : null;
  }

  function hasInStockVariant(product) {
    return Array.isArray(product.variants) && product.variants.some(function (variant) {
      return variant.inStock;
    });
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
    if (product.image) {
      return normalizeImagePath(product.image);
    }

    if (Array.isArray(product.images) && product.images.length) {
      return normalizeImagePath(product.images[0]);
    }

    const variantWithImage = Array.isArray(product.variants)
      ? product.variants.find(function (variant) {
          return variant && variant.image;
        })
      : null;

    if (variantWithImage && variantWithImage.image) {
      return normalizeImagePath(variantWithImage.image);
    }

    return "images/products/placeholder.PNG";
  }

  function getSelectedCategories() {
    return categoryChecks
      .filter(function (check) {
        return check.checked;
      })
      .map(function (check) {
        return String(check.value || "").trim().toLowerCase().replace(/\s+/g, "-");
      });
  }

  function filterProducts(items) {
    const selectedCategories = getSelectedCategories();
    const minPrice = minPriceInput && minPriceInput.value !== "" ? Number(minPriceInput.value) : null;
    const maxPrice = maxPriceInput && maxPriceInput.value !== "" ? Number(maxPriceInput.value) : null;
    const stockOnly = inStockOnly ? inStockOnly.checked : false;

    return items.filter(function (product) {
      const productCategory = normalizeCategory(product.category || "");
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
    const sorted = items.slice();

    switch (sortValue) {
      case "price-low":
        sorted.sort(function (a, b) {
          return getLowestPrice(a) - getLowestPrice(b);
        });
        break;

      case "price-high":
        sorted.sort(function (a, b) {
          return getLowestPrice(b) - getLowestPrice(a);
        });
        break;

      case "name-az":
        sorted.sort(function (a, b) {
          return String(a.name || "").localeCompare(String(b.name || ""));
        });
        break;

      case "name-za":
        sorted.sort(function (a, b) {
          return String(b.name || "").localeCompare(String(a.name || ""));
        });
        break;

      case "featured":
      default:
        sorted.sort(function (a, b) {
          const aSort = Number(a.sortOrder || 0);
          const bSort = Number(b.sortOrder || 0);

          if (aSort !== bSort) return aSort - bSort;

          return String(a.name || "").localeCompare(String(b.name || ""));
        });
        break;
    }

    return sorted;
  }

  function productCardMarkup(product) {
    const image = getProductImage(product);
    const comparePrice = formatCompareRange(product);
    const price = formatPriceRange(product);
    const badge = product.badge || "SALE";
    const link = `product-page/product.html?slug=${encodeURIComponent(product.slug)}`;

    return `
      <article class="catalog-product-card">
        <div class="catalog-product-image-wrap">
          <span class="catalog-badge">${escapeHtml(badge)}</span>
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(product.name)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='images/products/placeholder.PNG';"
          />
        </div>

        <div class="catalog-product-body">
          <h3 class="catalog-product-title">${escapeHtml(product.name)}</h3>

          <div class="catalog-product-price-wrap">
            ${comparePrice ? `<span class="catalog-product-old-price">${escapeHtml(comparePrice)}</span>` : ""}
            <span class="catalog-product-price">${escapeHtml(price)}</span>
          </div>

          <a href="${escapeHtml(link)}" class="catalog-product-button">View Product</a>
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

  async function loadProducts() {
    resultsText.textContent = "Loading products...";
    catalogGrid.innerHTML = `
      <div class="catalog-empty">
        Loading products...
      </div>
    `;

    const supabaseProducts = await fetchSupabaseProducts();

    if (Array.isArray(supabaseProducts) && supabaseProducts.length) {
      products = supabaseProducts;
      renderProducts();
      return;
    }

    const fallbackProducts = Array.isArray(window.AXIOM_PRODUCTS) ? window.AXIOM_PRODUCTS : [];
    products = fallbackProducts;
    renderProducts();
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

  categoryChecks.forEach(function (check) {
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
      categoryChecks.forEach(function (check) {
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

  loadProducts();
});
