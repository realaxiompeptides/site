(function () {
  const CART_STORAGE_KEY = "axiom_cart";

  const modal = document.getElementById("coaModal");
  const modalTitle = document.getElementById("coaModalTitle");
  const modalMeta = document.getElementById("coaModalMeta");
  const modalBody = document.getElementById("coaModalBody");
  const modalOpenImage = document.getElementById("coaModalOpenImage");
  const coaGrid = document.getElementById("coaGrid");
  const coaStats = document.getElementById("coaStats");
  const searchInput = document.getElementById("coaSearchInput");
  const cartCount = document.getElementById("cartCount");

  const urlParams = new URLSearchParams(window.location.search);
  const initialProductSlug = String(urlParams.get("product") || "").trim().toLowerCase();
  const initialVariantId = String(urlParams.get("variant") || "").trim().toLowerCase();

  let allProducts = [];
  let selectedVariantButton = null;

  function getSupabase() {
    return window.axiomSupabase || window.AXIOM_SUPABASE || window.supabaseClient || null;
  }

  async function waitForSupabase(maxAttempts, delayMs) {
    for (let i = 0; i < maxAttempts; i += 1) {
      const client = getSupabase();
      if (client) return client;

      await new Promise(function (resolve) {
        setTimeout(resolve, delayMs);
      });
    }

    return null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeString(value) {
    return String(value || "").trim();
  }

  function normalizeImagePath(path) {
    const clean = safeString(path);
    if (!clean) return "";

    if (
      clean.startsWith("http://") ||
      clean.startsWith("https://") ||
      clean.startsWith("//")
    ) {
      return clean;
    }

    if (clean.startsWith("../") || clean.startsWith("./") || clean.startsWith("/")) {
      return clean;
    }

    return "../" + clean.replace(/^\/+/, "");
  }

  function getLocalCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      console.error("Failed to read cart:", error);
      return [];
    }
  }

  function updateCartCount() {
    if (!cartCount) return;

    const total = getLocalCart().reduce(function (sum, item) {
      return sum + Number(item.quantity || item.qty || 0);
    }, 0);

    cartCount.textContent = String(total);
  }

  function renderLoadingState() {
    coaGrid.innerHTML = `
      <div class="coa-loading-state">
        <h3>Loading COAs...</h3>
        <p class="coa-loading-copy">Loading all products and certificates.</p>
      </div>
    `;
  }

  function renderFullEmptyState(title, message) {
    coaGrid.innerHTML = `
      <div class="coa-empty-full">
        <h3>${escapeHtml(title)}</h3>
        <p class="coa-loading-copy">${escapeHtml(message)}</p>
      </div>
    `;
  }

  function normalizeVariant(variant) {
    return {
      id: safeString(variant && variant.id),
      variant_id: safeString(variant && variant.variant_id),
      label: safeString(variant && variant.label) || "Variant",
      price: Number((variant && variant.price) || 0),
      compare_at_price: Number((variant && variant.compare_at_price) || 0),
      stock_quantity: Number((variant && variant.stock_quantity) || 0),
      image: safeString(variant && variant.image),
      is_active: variant && variant.is_active === false ? false : true,
      sort_order: Number((variant && variant.sort_order) || 0),
      coa_image_url: safeString(variant && variant.coa_image_url),
      coa_title: safeString(variant && variant.coa_title),
      coa_lot_number: safeString(variant && variant.coa_lot_number),
      coa_tested_at: safeString(variant && variant.coa_tested_at),
      coa_verified: !!(variant && variant.coa_verified)
    };
  }

  function normalizeProduct(product) {
    const variants = safeArray(product && product.product_variants)
      .map(normalizeVariant)
      .filter(function (variant) {
        return variant.is_active !== false;
      })
      .sort(function (a, b) {
        return Number(a.sort_order || 0) - Number(b.sort_order || 0);
      });

    return {
      id: safeString(product && product.id),
      slug: safeString(product && product.slug),
      name: safeString(product && product.name) || "Product",
      category: safeString(product && product.category),
      description: safeString(product && product.description),
      main_image: safeString(product && product.main_image),
      main_coa_image: safeString(product && product.main_coa_image),
      is_active: product && product.is_active === false ? false : true,
      product_variants: variants
    };
  }

  async function loadProductsFromSupabase() {
    const supabase = await waitForSupabase(50, 120);
    if (!supabase) {
      throw new Error("Supabase client was not available.");
    }

    const response = await supabase
      .from("products")
      .select(`
        id,
        slug,
        name,
        category,
        description,
        main_image,
        main_coa_image,
        is_active,
        sort_order,
        created_at,
        product_variants (
          id,
          variant_id,
          label,
          price,
          compare_at_price,
          stock_quantity,
          image,
          is_active,
          sort_order,
          coa_image_url,
          coa_title,
          coa_lot_number,
          coa_tested_at,
          coa_verified
        )
      `)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new Error(response.error.message || "Failed to load products.");
    }

    return safeArray(response.data)
      .map(normalizeProduct)
      .filter(function (product) {
        return product.slug && product.is_active !== false;
      });
  }

  function productHasAtLeastOneCoa(product) {
    if (safeString(product.main_coa_image)) return true;

    return safeArray(product.product_variants).some(function (variant) {
      return !!safeString(variant.coa_image_url);
    });
  }

  function getVariantByKeys(productSlug, variantId) {
    const product = allProducts.find(function (item) {
      return safeString(item.slug).toLowerCase() === safeString(productSlug).toLowerCase();
    });

    if (!product) {
      return { product: null, variant: null };
    }

    const variant = safeArray(product.product_variants).find(function (item) {
      return (
        safeString(item.id).toLowerCase() === safeString(variantId).toLowerCase() ||
        safeString(item.variant_id).toLowerCase() === safeString(variantId).toLowerCase()
      );
    });

    return {
      product: product || null,
      variant: variant || null
    };
  }

  async function trackCoaOpen(product, variant) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const visitorId =
        window.AXIOM_HELPERS && typeof window.AXIOM_HELPERS.getVisitorId === "function"
          ? window.AXIOM_HELPERS.getVisitorId()
          : "unknown";

      await supabase.from("page_views").insert({
        visitor_id: visitorId,
        path:
          (window.location.pathname || "/") +
          "?coa_open=1&product=" +
          encodeURIComponent(product.slug || "") +
          "&variant=" +
          encodeURIComponent(variant.variant_id || variant.id || ""),
        referrer: document.referrer || null,
        viewed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn("COA open tracking skipped:", error);
    }
  }

  function buildModalMeta(variant) {
    const parts = [];

    if (variant.label) parts.push(variant.label);
    if (variant.coa_lot_number) parts.push("Lot " + variant.coa_lot_number);
    if (variant.coa_tested_at) parts.push("Tested " + variant.coa_tested_at);
    if (variant.coa_verified) parts.push("Verified");

    return parts.join(" • ");
  }

  function resolveCoaPath(product, variant) {
    const variantPath = safeString(variant && variant.coa_image_url);
    const mainPath = safeString(product && product.main_coa_image);

    if (variantPath) return normalizeImagePath(variantPath);
    if (mainPath) return normalizeImagePath(mainPath);

    return "";
  }

  function openCoaModal(product, variant) {
    const productName = safeString(product && product.name) || "Product";
    const variantLabel = safeString(variant && variant.label) || "Variant";
    const title =
      safeString(variant && variant.coa_title) ||
      (productName + " — " + variantLabel + " COA");

    const coaImageUrl = resolveCoaPath(product, variant);

    modalTitle.textContent = title;
    modalMeta.textContent = buildModalMeta(variant);

    if (coaImageUrl) {
      modalOpenImage.hidden = false;
      modalOpenImage.href = coaImageUrl;

      modalBody.innerHTML = `
        <div class="coa-meta-list">
          ${
            variant.label
              ? `<div class="coa-meta-chip"><i class="fa-solid fa-vial"></i>${escapeHtml(variant.label)}</div>`
              : ""
          }
          ${
            variant.coa_lot_number
              ? `<div class="coa-meta-chip"><i class="fa-solid fa-hashtag"></i>Lot ${escapeHtml(variant.coa_lot_number)}</div>`
              : ""
          }
          ${
            variant.coa_tested_at
              ? `<div class="coa-meta-chip"><i class="fa-regular fa-calendar"></i>${escapeHtml(variant.coa_tested_at)}</div>`
              : ""
          }
          ${
            variant.coa_verified
              ? `<div class="coa-meta-chip"><i class="fa-solid fa-badge-check"></i>Verified</div>`
              : ""
          }
        </div>

        <div class="coa-modal-image-wrap">
          <img src="${escapeHtml(coaImageUrl)}" alt="${escapeHtml(title)}" />
        </div>
      `;
    } else {
      modalOpenImage.hidden = true;
      modalOpenImage.removeAttribute("href");

      modalBody.innerHTML = `
        <div class="coa-empty-state">
          <h3>COA not uploaded yet</h3>
          <p>
            The certificate for <strong>${escapeHtml(productName)} ${escapeHtml(variantLabel)}</strong>
            has not been posted yet.
          </p>
          <p>
            Our team is still preparing or reviewing the lab documentation.
            Please check back soon for the completed COA.
          </p>
        </div>
      `;
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    trackCoaOpen(product, variant);
  }

  function closeCoaModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function buildVariantButtonHtml(product, variant, isSelected) {
    const variantKey = safeString(variant.variant_id || variant.id);
    const hasCoa = !!resolveCoaPath(product, variant);

    return `
      <button
        type="button"
        class="coa-variant-btn ${hasCoa ? "has-coa" : "no-coa"} ${isSelected ? "is-selected" : ""}"
        data-product-slug="${escapeHtml(product.slug)}"
        data-variant-key="${escapeHtml(variantKey)}"
      >
        ${escapeHtml(variant.label || "Variant")}
      </button>
    `;
  }

  function getCardDescription(product, variants) {
    if (safeString(product.description)) {
      return safeString(product.description);
    }

    if (variants.length > 1) {
      return "Choose the matching strength to review the certificate associated with this product.";
    }

    return "Open the available certificate to review the associated product documentation.";
  }

  function renderProducts(products) {
    if (!products.length) {
      renderFullEmptyState("No matching products", "Try a different product or variant search.");
      coaStats.textContent = "0 products";
      return;
    }

    const withCoas = products.filter(productHasAtLeastOneCoa).length;
    coaStats.textContent =
      products.length +
      " products • " +
      withCoas +
      " COAs available";

    coaGrid.innerHTML = products
      .map(function (product) {
        const cardImage = normalizeImagePath(product.main_image) || "../images/placeholder.PNG";
        const variants = safeArray(product.product_variants);
        const hasAnyCoa = productHasAtLeastOneCoa(product);

        const variantButtons = variants.length
          ? variants
              .map(function (variant, index) {
                const isSelected =
                  (initialProductSlug &&
                    safeString(product.slug).toLowerCase() === initialProductSlug &&
                    initialVariantId &&
                    (
                      safeString(variant.variant_id).toLowerCase() === initialVariantId ||
                      safeString(variant.id).toLowerCase() === initialVariantId
                    )) ||
                  (!initialVariantId &&
                    initialProductSlug &&
                    safeString(product.slug).toLowerCase() === initialProductSlug &&
                    index === 0);

                return buildVariantButtonHtml(product, variant, isSelected);
              })
              .join("")
          : `<p class="coa-helper-text">No variants are currently available for this product.</p>`;

        return `
          <article class="coa-card" id="coa-product-${escapeHtml(product.slug)}">
            <div class="coa-card-media">
              <img src="${escapeHtml(cardImage)}" alt="${escapeHtml(product.name)}" />
            </div>

            <div class="coa-card-body">
              <div class="coa-card-title-row">
                <div>
                  <h2 class="coa-card-title">${escapeHtml(product.name)}</h2>
                </div>

                <span class="${hasAnyCoa ? "coa-pill" : "coa-empty-pill"}">
                  <i class="fa-solid ${hasAnyCoa ? "fa-badge-check" : "fa-hourglass-half"}"></i>
                  ${hasAnyCoa ? "COA Ready" : "Needs COA"}
                </span>
              </div>

              <div class="coa-variant-list">
                ${variantButtons}
              </div>

              <div class="coa-card-footer">
                <p class="coa-helper-text">
                  ${escapeHtml(getCardDescription(product, variants))}
                </p>

                <a
                  class="coa-product-link"
                  href="../product-page/product.html?slug=${encodeURIComponent(product.slug || "")}"
                >
                  View product
                </a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    bindVariantButtons();

    if (initialProductSlug) {
      const target = document.getElementById("coa-product-" + initialProductSlug);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function bindVariantButtons() {
    const buttons = coaGrid.querySelectorAll(".coa-variant-btn");

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (selectedVariantButton) {
          selectedVariantButton.classList.remove("is-selected");
        }

        selectedVariantButton = button;
        button.classList.add("is-selected");

        const productSlug = safeString(button.getAttribute("data-product-slug")).toLowerCase();
        const variantKey = safeString(button.getAttribute("data-variant-key")).toLowerCase();

        const result = getVariantByKeys(productSlug, variantKey);
        if (!result.product || !result.variant) return;

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("product", productSlug);
        nextUrl.searchParams.set(
          "variant",
          safeString(result.variant.variant_id || result.variant.id)
        );
        window.history.replaceState({}, "", nextUrl.toString());

        openCoaModal(result.product, result.variant);
      });
    });

    if (!selectedVariantButton) {
      selectedVariantButton = coaGrid.querySelector(".coa-variant-btn.is-selected") || null;
    }
  }

  function applySearch() {
    const query = safeString(searchInput && searchInput.value).toLowerCase();

    if (!query) {
      renderProducts(allProducts);
      return;
    }

    const filtered = allProducts.filter(function (product) {
      const productText = [
        product.name,
        product.slug,
        product.category,
        product.description
      ]
        .join(" ")
        .toLowerCase();

      if (productText.includes(query)) return true;

      return safeArray(product.product_variants).some(function (variant) {
        return [
          variant.id,
          variant.variant_id,
          variant.label,
          variant.coa_title,
          variant.coa_lot_number
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    });

    renderProducts(filtered);
  }

  function bindSearch() {
    if (!searchInput) return;
    searchInput.addEventListener("input", applySearch);
  }

  function bindModalClose() {
    document.querySelectorAll("[data-close-coa-modal]").forEach(function (node) {
      node.addEventListener("click", closeCoaModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal && !modal.hidden) {
        closeCoaModal();
      }
    });
  }

  async function init() {
    updateCartCount();
    bindSearch();
    bindModalClose();
    renderLoadingState();

    try {
      allProducts = await loadProductsFromSupabase();

      if (!allProducts.length) {
        renderFullEmptyState(
          "No products found",
          "No active products were returned from Supabase."
        );
        coaStats.textContent = "0 products";
        return;
      }

      renderProducts(allProducts);

      if (initialProductSlug && initialVariantId) {
        const result = getVariantByKeys(initialProductSlug, initialVariantId);
        if (result.product && result.variant) {
          openCoaModal(result.product, result.variant);
        }
      }
    } catch (error) {
      console.error("COA page load failed:", error);
      renderFullEmptyState(
        "COA page failed to load",
        error && error.message
          ? error.message
          : "There was a problem loading products from Supabase."
      );
      coaStats.textContent = "Load failed";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
