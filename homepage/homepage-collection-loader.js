document.addEventListener("DOMContentLoaded", function () {
  const mount = document.getElementById("homepage-collection-mount");
  if (!mount) return;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
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

  function getProductImage(product) {
    if (product && product.main_image) {
      return normalizeImagePath(product.main_image);
    }

    if (
      product &&
      Array.isArray(product.gallery_images) &&
      product.gallery_images.length
    ) {
      return normalizeImagePath(product.gallery_images[0]);
    }

    return "images/products/placeholder.PNG";
  }

  function getActiveVariants(product) {
    const variants = Array.isArray(product?.product_variants)
      ? product.product_variants
      : [];

    return variants
      .filter(function (variant) {
        return variant && variant.is_active !== false;
      })
      .sort(function (a, b) {
        return Number(a.sort_order || 0) - Number(b.sort_order || 0);
      });
  }

  function getDisplayPrices(product) {
    const variants = getActiveVariants(product);

    if (!variants.length) {
      return {
        oldPrice: "",
        price: "$0.00"
      };
    }

    const prices = variants.map(function (variant) {
      return Number(variant.price || 0);
    });

    const comparePrices = variants
      .map(function (variant) {
        return Number(variant.compare_at_price || 0);
      })
      .filter(function (value) {
        return value > 0;
      });

    const minPrice = Math.min.apply(null, prices);
    const maxPrice = Math.max.apply(null, prices);

    const validComparePrices = comparePrices.filter(function (value) {
      return value > minPrice;
    });

    const minComparePrice = validComparePrices.length
      ? Math.min.apply(null, validComparePrices)
      : 0;
    const maxComparePrice = validComparePrices.length
      ? Math.max.apply(null, validComparePrices)
      : 0;

    const priceText =
      minPrice === maxPrice
        ? formatMoney(minPrice)
        : `${formatMoney(minPrice)} – ${formatMoney(maxPrice)}`;

    let oldPriceText = "";
    if (validComparePrices.length) {
      oldPriceText =
        minComparePrice === maxComparePrice
          ? formatMoney(minComparePrice)
          : `${formatMoney(minComparePrice)} – ${formatMoney(maxComparePrice)}`;
    }

    return {
      oldPrice: oldPriceText,
      price: priceText
    };
  }

  function buildHomepageProducts(products) {
    return products.map(function (product) {
      const prices = getDisplayPrices(product);

      return {
        name: product.name || "Product",
        oldPrice: prices.oldPrice,
        price: prices.price,
        image: getProductImage(product),
        badge: product.badge || "SALE",
        buttonText: "View Product",
        link: `product-page/product.html?slug=${encodeURIComponent(product.slug || "")}`
      };
    });
  }

  async function fetchSupabaseProducts() {
    if (!window.axiomSupabase) {
      throw new Error("Supabase client is not available.");
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
      throw new Error(error.message || "Failed to load homepage products.");
    }

    return Array.isArray(data) ? data : [];
  }

  function renderGrid(grid, products) {
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `
        <div class="dashboard-loading" style="grid-column:1 / -1; text-align:center;">
          No products found.
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(function (product) {
      return `
        <article class="homepage-product-card">
          <div class="homepage-product-image-wrap">
            ${product.badge ? `<span class="homepage-product-badge">${escapeHtml(product.badge)}</span>` : ""}
            <img
              src="${escapeHtml(product.image)}"
              alt="${escapeHtml(product.name)}"
              onerror="this.onerror=null;this.src='images/products/placeholder.PNG';"
            >
          </div>

          <div class="homepage-product-card-body">
            <h3 class="homepage-product-title">${escapeHtml(product.name)}</h3>

            <div class="homepage-product-price-block">
              ${product.oldPrice ? `<span class="homepage-product-old-price">${escapeHtml(product.oldPrice)}</span>` : ""}
              <span class="homepage-product-price">${escapeHtml(product.price)}</span>
            </div>

            <a href="${escapeHtml(product.link)}" class="homepage-product-button">
              ${escapeHtml(product.buttonText || "Shop Now")}
            </a>
          </div>
        </article>
      `;
    }).join("");
  }

  fetch("homepage/homepage-collection.html", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load homepage/homepage-collection.html");
      }
      return response.text();
    })
    .then(async function (html) {
      mount.innerHTML = html;

      const grid = document.getElementById("homepageCollectionGrid");
      if (!grid) return;

      grid.innerHTML = `
        <div class="dashboard-loading" style="grid-column:1 / -1; text-align:center;">
          Loading products...
        </div>
      `;

      try {
        const supabaseProducts = await fetchSupabaseProducts();
        const homepageProducts = buildHomepageProducts(supabaseProducts);
        renderGrid(grid, homepageProducts);
      } catch (error) {
        console.error("Supabase homepage products failed to load:", error);

        const fallbackProducts = Array.isArray(window.HOMEPAGE_COLLECTION_PRODUCTS)
          ? window.HOMEPAGE_COLLECTION_PRODUCTS
          : [];

        if (fallbackProducts.length) {
          renderGrid(grid, fallbackProducts);
          return;
        }

        grid.innerHTML = `
          <div class="dashboard-loading" style="grid-column:1 / -1; text-align:center;">
            Could not load products.
          </div>
        `;
      }
    })
    .catch(function (error) {
      console.error("Homepage collection failed to load:", error);
    });
});
