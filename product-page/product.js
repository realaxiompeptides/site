document.addEventListener("DOMContentLoaded", async function () {
  const productData = Array.isArray(window.AXIOM_PRODUCTS) ? window.AXIOM_PRODUCTS : [];

  const purchaseMount = document.getElementById("productPurchaseBoxMount");
  const descriptionMount = document.getElementById("productDescriptionMount");
  const iconBenefitsMount = document.getElementById("productIconBenefitsMount");
  const whyChooseUsMount = document.getElementById("productWhyChooseUsMount");
  const productPriceMount = document.getElementById("productPriceMount");

  async function loadPartial(url, mountEl) {
    if (!mountEl) return false;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
      mountEl.innerHTML = await response.text();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  await Promise.all([
    loadPartial("product-price.html", productPriceMount),
    loadPartial("product-purchase-box.html", purchaseMount),
    loadPartial("product-description.html", descriptionMount),
    loadPartial("icon-benefits.html", iconBenefitsMount),
    loadPartial("why-choose-us.html", whyChooseUsMount)
  ]);

  const params = new URLSearchParams(window.location.search);
  const slug = (params.get("slug") || "").trim().toLowerCase();

  const product = productData.find(function (item) {
    return String(item.slug || "").trim().toLowerCase() === slug;
  });

  const breadcrumbName = document.getElementById("productBreadcrumbName");
  const productBadge = document.getElementById("productBadge");
  const productName = document.getElementById("productName");
  const productPrice = document.getElementById("productPrice");
  const productOldPrice = document.getElementById("productOldPrice");
  const productSaveBadge = document.getElementById("productSaveBadge");
  const productSaveText = document.getElementById("productSaveText");
  const productShortDescription = document.getElementById("productShortDescription");
  const productLongDescription = document.getElementById("productLongDescription");
  const productMainImage = document.getElementById("productMainImage");

  const variantSelect = document.getElementById("productVariantSelect");
  const qtyInput = document.getElementById("productQty");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  const addToCartBtn = document.getElementById("productAddToCart");
  const cartCount = document.getElementById("cartCount");

  const CART_STORAGE_KEY = "axiom_cart";

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function getVariants(productObj) {
    return Array.isArray(productObj?.variants) ? productObj.variants : [];
  }

  function normalizeImagePath(path) {
    if (!path || typeof path !== "string") {
      return "../images/products/placeholder.PNG";
    }

    const cleanPath = path.trim();

    if (
      cleanPath.startsWith("../") ||
      cleanPath.startsWith("./") ||
      cleanPath.startsWith("/") ||
      cleanPath.startsWith("http://") ||
      cleanPath.startsWith("https://")
    ) {
      return cleanPath;
    }

    return `../${cleanPath}`;
  }

  function getImageForVariant(productObj, variantIndex) {
    const variants = Array.isArray(productObj?.variants) ? productObj.variants : [];
    const selectedVariant = variants[variantIndex] || variants[0] || null;

    if (selectedVariant?.image) {
      return normalizeImagePath(selectedVariant.image);
    }

    const images = Array.isArray(productObj?.images) ? productObj.images : [];
    if (images.length) {
      return normalizeImagePath(images[variantIndex] || images[0]);
    }

    if (productObj?.image) {
      return normalizeImagePath(productObj.image);
    }

    return "../images/products/placeholder.PNG";
  }

  function setMainImage(src, alt) {
    if (!productMainImage) return;
    productMainImage.src = src;
    productMainImage.alt = alt || "Product image";
    productMainImage.onerror = function () {
      this.onerror = null;
      this.src = "../images/products/placeholder.PNG";
    };
  }

  function getLocalCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      console.error("Failed to read cart from localStorage", error);
      return [];
    }
  }

  function saveLocalCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }

  function getCartItemQuantity(item) {
    return Number(item.quantity || item.qty || 0);
  }

  function updateCartCountDisplay() {
    if (!cartCount) return;

    const cart = getLocalCart();
    const totalItems = cart.reduce(function (sum, item) {
      return sum + getCartItemQuantity(item);
    }, 0);

    cartCount.textContent = String(totalItems);
  }

  async function syncLocalCartToSupabase() {
    try {
      if (!window.AXIOM_CHECKOUT_SESSION || typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function") {
        return;
      }

      const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
      if (!sessionId) return;

      const localCart = getLocalCart();

      const subtotal = localCart.reduce(function (sum, item) {
        return sum + (Number(item.price || 0) * getCartItemQuantity(item));
      }, 0);

      const cartItemsForSession = localCart.map(function (item) {
        return {
          id: item.id || "",
          slug: item.slug || "",
          name: item.name || "Product",
          variantLabel: item.variantLabel || item.variant || "",
          variant_label: item.variantLabel || item.variant || "",
          price: Number(item.price || 0),
          compareAtPrice:
            item.compareAtPrice !== undefined && item.compareAtPrice !== null
              ? Number(item.compareAtPrice) || null
              : null,
          compare_at_price:
            item.compareAtPrice !== undefined && item.compareAtPrice !== null
              ? Number(item.compareAtPrice) || null
              : null,
          quantity: getCartItemQuantity(item),
          qty: getCartItemQuantity(item),
          image: item.image || "",
          weightOz: Number(item.weightOz || 0),
          weight_oz: Number(item.weightOz || 0),
          inStock: item.inStock !== false,
          in_stock: item.inStock !== false
        };
      });

      if (typeof window.AXIOM_CHECKOUT_SESSION.patchSession === "function") {
        await window.AXIOM_CHECKOUT_SESSION.patchSession({
          cart_items: cartItemsForSession,
          subtotal: subtotal,
          total_amount: subtotal,
          session_status: "active"
        });
      }
    } catch (error) {
      console.error("Failed to sync local cart to Supabase:", error);
    }
  }

  function hidePriceSection() {
    if (productPrice) productPrice.textContent = "";

    if (productOldPrice) {
      productOldPrice.textContent = "";
      productOldPrice.hidden = true;
    }

    if (productSaveText) productSaveText.textContent = "";
    if (productSaveBadge) productSaveBadge.hidden = true;
  }

  function renderVariantPrice(variant) {
    if (!productPrice) return;

    const currentPrice = Number(variant?.price || 0);
    const oldPrice = Number(variant?.compareAtPrice || 0);

    productPrice.textContent = formatMoney(currentPrice);

    if (productOldPrice && productSaveBadge && productSaveText && oldPrice > currentPrice) {
      const savingsPercent = Math.round(((oldPrice - currentPrice) / oldPrice) * 100);

      productOldPrice.textContent = formatMoney(oldPrice);
      productOldPrice.hidden = false;

      productSaveText.textContent = `SAVE ${savingsPercent}%`;
      productSaveBadge.hidden = false;
    } else {
      if (productOldPrice) {
        productOldPrice.textContent = "";
        productOldPrice.hidden = true;
      }

      if (productSaveText) productSaveText.textContent = "";
      if (productSaveBadge) productSaveBadge.hidden = true;
    }
  }

  function showNotFoundState() {
    if (productBadge) productBadge.textContent = "SALE";
    if (productName) productName.textContent = "Product not found";
    if (breadcrumbName) breadcrumbName.textContent = "Product";

    if (productShortDescription) {
      productShortDescription.textContent =
        "The product slug in the URL does not match your product data file.";
    }

    if (productLongDescription) {
      productLongDescription.textContent =
        "Check that the product link uses product-page/product.html?slug=your-product-slug and that the slug exists in ../js/product-data.js.";
    }

    hidePriceSection();
    setMainImage("../images/products/placeholder.PNG", "Product not found");

    if (variantSelect) {
      variantSelect.innerHTML = `<option value="">Unavailable</option>`;
      variantSelect.disabled = true;
    }

    if (qtyInput) qtyInput.value = "1";
    if (qtyMinus) qtyMinus.disabled = true;
    if (qtyPlus) qtyPlus.disabled = true;
    if (addToCartBtn) addToCartBtn.disabled = true;
  }

  if (!product) {
    showNotFoundState();
    updateCartCountDisplay();
    return;
  }

  const variants = getVariants(product);

  if (productBadge) productBadge.textContent = product.badge || "SALE";
  if (productName) productName.textContent = product.name || "Product";
  if (breadcrumbName) breadcrumbName.textContent = product.name || "Product";
  if (productShortDescription) productShortDescription.textContent = product.description || "";
  if (productLongDescription) productLongDescription.innerHTML = product.longDescription || "";

  if (!variants.length) {
    hidePriceSection();
    setMainImage(getImageForVariant(product, 0), product.name || "Product");

    if (variantSelect) {
      variantSelect.innerHTML = `<option value="">Unavailable</option>`;
      variantSelect.disabled = true;
    }

    if (qtyInput) qtyInput.value = "1";
    if (qtyMinus) qtyMinus.disabled = true;
    if (qtyPlus) qtyPlus.disabled = true;
    if (addToCartBtn) addToCartBtn.disabled = true;

    updateCartCountDisplay();
    return;
  }

  if (variantSelect) {
    variantSelect.innerHTML = variants
      .map(function (variant, index) {
        const soldOutText = variant.inStock === false ? " — Sold Out" : "";
        return `<option value="${index}">${variant.label}${soldOutText}</option>`;
      })
      .join("");
    variantSelect.disabled = false;
  }

  if (qtyInput) {
    qtyInput.value = "1";
    qtyInput.min = "1";
  }

  function getSelectedVariantIndex() {
    if (!variantSelect) return 0;
    const parsed = Number(variantSelect.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function getSelectedVariant() {
    return variants[getSelectedVariantIndex()] || variants[0];
  }

  function updateVariantDisplay() {
    const variant = getSelectedVariant();
    if (!variant) return;

    renderVariantPrice(variant);

    const imageSrc = getImageForVariant(product, getSelectedVariantIndex());
    setMainImage(imageSrc, `${product.name} ${variant.label}`);

    if (addToCartBtn) {
      const inStock = variant.inStock !== false;
      addToCartBtn.disabled = !inStock;
      addToCartBtn.textContent = inStock ? "Add To Cart" : "Out Of Stock";
    }
  }

  updateVariantDisplay();
  updateCartCountDisplay();

  if (variantSelect) {
    variantSelect.addEventListener("change", updateVariantDisplay);
  }

  if (qtyMinus && qtyInput) {
    qtyMinus.disabled = false;
    qtyMinus.addEventListener("click", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = String(Math.max(1, current - 1));
    });
  }

  if (qtyPlus && qtyInput) {
    qtyPlus.disabled = false;
    qtyPlus.addEventListener("click", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = String(current + 1);
    });
  }

  if (qtyInput) {
    qtyInput.addEventListener("input", function () {
      const current = Number(qtyInput.value) || 1;
      qtyInput.value = String(Math.max(1, current));
    });
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async function () {
      const variant = getSelectedVariant();
      if (!variant || variant.inStock === false) return;

      const quantity = Math.max(1, Number(qtyInput ? qtyInput.value : 1) || 1);
      const selectedIndex = getSelectedVariantIndex();
      const image = getImageForVariant(product, selectedIndex);

      const cartItem = {
        id: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        variant: variant.label,
        price: Number(variant.price) || 0,
        compareAtPrice:
          variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
            ? Number(variant.compareAtPrice) || null
            : null,
        oldPrice:
          variant.compareAtPrice !== undefined && variant.compareAtPrice !== null
            ? Number(variant.compareAtPrice) || null
            : null,
        quantity: quantity,
        qty: quantity,
        image: image,
        weightOz: Number(variant.weightOz) || 0,
        inStock: variant.inStock !== false
      };

      const cart = getLocalCart();
      const existingIndex = cart.findIndex(function (item) {
        return item.id === cartItem.id;
      });

      if (existingIndex > -1) {
        const currentQty = getCartItemQuantity(cart[existingIndex]);
        cart[existingIndex].quantity = currentQty + quantity;
        cart[existingIndex].qty = currentQty + quantity;
      } else {
        cart.push(cartItem);
      }

      saveLocalCart(cart);
      updateCartCountDisplay();

      window.dispatchEvent(new Event("axiom-cart-updated"));
      document.dispatchEvent(new CustomEvent("axiom-cart-updated"));

      if (typeof window.renderCartDrawer === "function") {
        window.renderCartDrawer();
      }

      if (typeof window.openCartDrawer === "function") {
        window.openCartDrawer();
      } else {
        addToCartBtn.textContent = "Added To Cart";
        setTimeout(function () {
          const currentVariant = getSelectedVariant();
          if (!currentVariant || currentVariant.inStock === false) return;
          addToCartBtn.textContent = "Add To Cart";
        }, 1200);
      }

      await syncLocalCartToSupabase();
    });
  }

  window.addEventListener("axiom-cart-updated", function () {
    updateCartCountDisplay();
  });

  window.addEventListener("storage", function () {
    updateCartCountDisplay();
  });
});
