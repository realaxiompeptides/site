function initCartDrawer() {
  const cartDrawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("siteOverlay");
  const cartClose = document.getElementById("cartClose");

  const cartCount = document.getElementById("cartCount");
  const cartItemsList = document.getElementById("cartItemsList");
  const cartEmptyState = document.getElementById("cartEmptyState");

  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartShipping = document.getElementById("cartShipping");
  const cartTax = document.getElementById("cartTax");
  const cartTotal = document.getElementById("cartTotal");

  const cartDiscountCode = document.getElementById("cartDiscountCode");
  const applyCartDiscount = document.getElementById("applyCartDiscount");
  const cartDiscountMessage = document.getElementById("cartDiscountMessage");
  const cartDiscountRow = document.getElementById("cartDiscountRow");
  const cartDiscountAmount = document.getElementById("cartDiscountAmount");

  const cartProgressText = document.getElementById("cartProgressText");
  const cartProgressFill = document.getElementById("cartProgressFill");

  const cartRecommendSection = document.getElementById("cartRecommendSection");
  const cartRecommendList = document.getElementById("cartRecommendList");

  const cartDrawerItemCount = document.getElementById("cartDrawerItemCount");

  const FREE_SHIPPING_THRESHOLD = 150;

  const BASE_PATH = window.location.hostname.includes("github.io") ? "/site/" : "/";
  const PRODUCT_IMAGE_BASE = `${BASE_PATH}images/products/`;
  const DEFAULT_IMAGE = `${BASE_PATH}images/axiom-logo.PNG`;

  const RECOMMENDED_PRODUCTS = [
    {
      id: "bacwater-10ml",
      slug: "bac-water-10ml",
      name: "BAC Water (10ML)",
      price: 10,
      image: `${PRODUCT_IMAGE_BASE}bac-water-10ml-main.PNG`,
      variantLabel: "10ML",
      weightOz: 9.6,
      inStock: true
    }
  ];

  function getCartToggle() {
    return document.getElementById("cartToggle");
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("axiom_cart") || "[]");
    } catch (error) {
      console.error("Failed to read cart from localStorage", error);
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem("axiom_cart", JSON.stringify(cart));
  }

  function getDiscount() {
    try {
      return JSON.parse(localStorage.getItem("axiomDiscount") || "null");
    } catch (error) {
      console.error("Failed to read discount from localStorage", error);
      return null;
    }
  }

  function saveDiscount(discount) {
    localStorage.setItem("axiomDiscount", JSON.stringify(discount));
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function getItemQuantity(item) {
    return Number(item.quantity || item.qty || 0);
  }

  function setItemQuantity(item, quantity) {
    item.quantity = quantity;
    item.qty = quantity;
  }

  function slugifyProductString(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\+/g, " plus ")
      .replace(/[()]/g, " ")
      .replace(/['".,]/g, "")
      .replace(/\//g, "-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function normalizeImagePath(path) {
    if (!path || typeof path !== "string") {
      return DEFAULT_IMAGE;
    }

    const cleanPath = path.trim();

    if (!cleanPath) return DEFAULT_IMAGE;

    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      return cleanPath;
    }

    if (cleanPath.startsWith("/")) {
      return cleanPath;
    }

    if (cleanPath.startsWith("images/")) {
      return `${BASE_PATH}${cleanPath}`;
    }

    if (cleanPath.startsWith("./images/")) {
      return `${BASE_PATH}${cleanPath.replace("./", "")}`;
    }

    if (cleanPath.startsWith("../images/")) {
      return `${BASE_PATH}${cleanPath.replace(/^(\.\.\/)+/, "")}`;
    }

    if (cleanPath.startsWith("./")) {
      return `${BASE_PATH}${cleanPath.replace("./", "")}`;
    }

    if (cleanPath.startsWith("../")) {
      return `${BASE_PATH}${cleanPath.replace(/^(\.\.\/)+/, "")}`;
    }

    return `${PRODUCT_IMAGE_BASE}${cleanPath}`;
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function buildImageCandidatesFromKey(key) {
    const cleanKey = slugifyProductString(key);
    if (!cleanKey) return [];

    return [
      `${PRODUCT_IMAGE_BASE}${cleanKey}-main.PNG`,
      `${PRODUCT_IMAGE_BASE}${cleanKey}-main.png`,
      `${PRODUCT_IMAGE_BASE}${cleanKey}.PNG`,
      `${PRODUCT_IMAGE_BASE}${cleanKey}.png`
    ];
  }

  function buildProductImageCandidates(item) {
    const candidates = [];

    if (item && typeof item.image === "string" && item.image.trim()) {
      candidates.push(normalizeImagePath(item.image));
    }

    const rawKeys = [
      item && item.slug,
      item && item.id,
      item && item.name,
      item && item.product_name,
      item && item.variant,
      item && item.variantLabel,
      item && item.variant_label
    ];

    const normalizedName = item && item.name
      ? slugifyProductString(
          String(item.name)
            .replace(/\(([^)]+)\)/g, "-$1")
            .replace(/\s+/g, " ")
        )
      : "";

    const specialKeys = [
      normalizedName,
      item && item.slug && item.variantLabel
        ? `${item.slug}-${item.variantLabel}`
        : "",
      item && item.slug && item.variant
        ? `${item.slug}-${item.variant}`
        : "",
      item && item.name && item.variantLabel
        ? `${item.name}-${item.variantLabel}`
        : "",
      item && item.id === "bacwater-10ml" ? "bac-water-10ml" : "",
      item && item.id === "bacwater-3ml" ? "bac-water-3ml" : "",
      item && item.id === "mt2-10mg" ? "mt-2-10mg" : "",
      item && item.id === "mt1-10mg" ? "mt-1-10mg" : ""
    ];

    const allKeys = uniqueValues([...rawKeys, ...specialKeys]);

    allKeys.forEach((key) => {
      candidates.push(...buildImageCandidatesFromKey(key));
    });

    candidates.push(DEFAULT_IMAGE);

    return uniqueValues(candidates);
  }

  function getAllProducts() {
    if (Array.isArray(window.AXIOM_PRODUCTS) && window.AXIOM_PRODUCTS.length) {
      return window.AXIOM_PRODUCTS;
    }

    if (Array.isArray(window.productData) && window.productData.length) {
      return window.productData;
    }

    return [];
  }

  function getProductImageCandidates(product) {
    if (!product || typeof product !== "object") {
      return [DEFAULT_IMAGE];
    }

    const candidates = [];

    if (typeof product.image === "string" && product.image.trim()) {
      candidates.push(normalizeImagePath(product.image));
    }

    if (Array.isArray(product.images) && product.images.length) {
      product.images.forEach((img) => {
        if (typeof img === "string" && img.trim()) {
          candidates.push(normalizeImagePath(img));
        }
      });
    }

    candidates.push(...buildProductImageCandidates(product));
    candidates.push(DEFAULT_IMAGE);

    return uniqueValues(candidates);
  }

  function findMatchingProduct(item) {
    const products = getAllProducts();
    if (!products.length || !item) return null;

    return products.find(function (product) {
      if (!product || typeof product !== "object") return false;

      if (item.slug && product.slug && String(item.slug) === String(product.slug)) {
        return true;
      }

      if (item.id && product.id && String(item.id) === String(product.id)) {
        return true;
      }

      if (Array.isArray(product.variants)) {
        return product.variants.some(function (variant) {
          if (!variant) return false;

          if (item.id && variant.id && String(item.id) === String(variant.id)) {
            return true;
          }

          return false;
        });
      }

      return false;
    }) || null;
  }

  function resolveCartItemImageData(item) {
    const matchingProduct = findMatchingProduct(item);

    if (matchingProduct) {
      const productCandidates = getProductImageCandidates(matchingProduct);
      return {
        image: productCandidates[0] || DEFAULT_IMAGE,
        imageCandidates: productCandidates
      };
    }

    const itemCandidates = buildProductImageCandidates(item);
    return {
      image: itemCandidates[0] || DEFAULT_IMAGE,
      imageCandidates: itemCandidates
    };
  }

  function normalizeCartItem(item) {
    const normalizedQty = getItemQuantity(item);
    const imageData = resolveCartItemImageData(item);

    return {
      id: item.id || "",
      slug: item.slug || "",
      name: item.name || "Product",
      product_name: item.name || "Product",
      variantLabel: item.variantLabel || item.variant || "",
      variant_label: item.variantLabel || item.variant || "",
      variant: item.variantLabel || item.variant || "",
      price: Number(item.price) || 0,
      unit_price: Number(item.price) || 0,
      compareAtPrice:
        item.compareAtPrice !== undefined && item.compareAtPrice !== null
          ? Number(item.compareAtPrice) || null
          : item.oldPrice !== undefined && item.oldPrice !== null
            ? Number(item.oldPrice) || null
            : item.compare_at_price !== undefined && item.compare_at_price !== null
              ? Number(item.compare_at_price) || null
              : null,
      compare_at_price:
        item.compare_at_price !== undefined && item.compare_at_price !== null
          ? Number(item.compare_at_price) || null
          : item.compareAtPrice !== undefined && item.compareAtPrice !== null
            ? Number(item.compareAtPrice) || null
            : item.oldPrice !== undefined && item.oldPrice !== null
              ? Number(item.oldPrice) || null
              : null,
      image: imageData.image,
      imageCandidates: imageData.imageCandidates,
      quantity: normalizedQty,
      qty: normalizedQty,
      line_total: (Number(item.price) || 0) * normalizedQty,
      weightOz:
        item.weightOz !== undefined && item.weightOz !== null
          ? Number(item.weightOz) || 0
          : item.weight_oz !== undefined && item.weight_oz !== null
            ? Number(item.weight_oz) || 0
            : item.id === "bacwater-10ml"
              ? 9.6
              : 0.188,
      weight_oz:
        item.weight_oz !== undefined && item.weight_oz !== null
          ? Number(item.weight_oz) || 0
          : item.weightOz !== undefined && item.weightOz !== null
            ? Number(item.weightOz) || 0
            : item.id === "bacwater-10ml"
              ? 9.6
              : 0.188,
      inStock: item.inStock !== false,
      in_stock: item.inStock !== false
    };
  }

  function getPageLink(pathFromRoot) {
    const cleanPath = String(pathFromRoot || "").replace(/^\/+/, "");

    if (window.location.hostname.includes("github.io")) {
      return `${BASE_PATH}${cleanPath}`;
    }

    return `/${cleanPath}`;
  }

  function bindStaticLinks() {
    const browseProductsLinks = document.querySelectorAll('.cart-empty-state a[href], .cart-outline-btn[href*="catalog"]');
    const viewCartLinks = document.querySelectorAll('.cart-action-stack a[href*="cart-page"], .cart-action-stack a[href*="cart.html"]');
    const checkoutLinks = document.querySelectorAll('.cart-action-stack a[href*="checkout"]');

    browseProductsLinks.forEach(link => {
      if (link.closest(".cart-empty-state")) {
        link.setAttribute("href", getPageLink("catalog.html"));
      }
    });

    viewCartLinks.forEach(link => {
      link.setAttribute("href", getPageLink("cart-page/cart.html"));
    });

    checkoutLinks.forEach(link => {
      link.setAttribute("href", getPageLink("checkout/checkout.html"));
    });
  }

  function updateToggleAria(expanded) {
    const cartToggle = getCartToggle();
    if (cartToggle) {
      cartToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  }

  function openCart() {
    if (!cartDrawer || !overlay) return;
    renderCart();
    cartDrawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    updateToggleAria(true);
    cartDrawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    if (!cartDrawer || !overlay) return;
    cartDrawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    updateToggleAria(false);
    cartDrawer.setAttribute("aria-hidden", "true");
  }

  function getDiscountValue(subtotal) {
    const discount = getDiscount();
    if (!discount) return 0;
    if (discount.type === "percent") return subtotal * (discount.amount / 100);
    if (discount.type === "fixed") return Math.min(discount.amount, subtotal);
    return 0;
  }

  function getCartSubtotal(cart) {
    return cart.reduce((sum, item) => {
      return sum + (Number(item.price || 0) * getItemQuantity(item));
    }, 0);
  }

  window.AXIOM_HANDLE_CART_IMAGE_ERROR = function (img) {
    if (!img) return;

    const fallbackList = (img.dataset.fallbacks || "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean);

    let nextIndex = Number(img.dataset.fallbackIndex || "0");

    if (nextIndex < fallbackList.length) {
      img.dataset.fallbackIndex = String(nextIndex + 1);
      img.src = fallbackList[nextIndex];
      return;
    }

    if (img.src !== DEFAULT_IMAGE) {
      img.src = DEFAULT_IMAGE;
    }
  };

  async function syncCartToCheckoutSession(cartOverride) {
    try {
      const normalizedCart = Array.isArray(cartOverride)
        ? cartOverride.map(normalizeCartItem)
        : getCart().map(normalizeCartItem);

      const subtotal = getCartSubtotal(normalizedCart);
      const discountValue = getDiscountValue(subtotal);
      const discountedSubtotal = Math.max(subtotal - discountValue, 0);

      if (window.AXIOM_CART_CHECKOUT_SYNC && typeof window.AXIOM_CART_CHECKOUT_SYNC.syncToSession === "function") {
        await window.AXIOM_CART_CHECKOUT_SYNC.syncToSession({
          cart_items: normalizedCart,
          subtotal: subtotal,
          discount_amount: discountValue,
          shipping_amount: 0,
          tax_amount: 0,
          total_amount: discountedSubtotal,
          session_status: "active"
        });
        return;
      }

      if (
        !window.AXIOM_CHECKOUT_SESSION ||
        typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function" ||
        typeof window.AXIOM_CHECKOUT_SESSION.patchSession !== "function"
      ) {
        return;
      }

      await window.AXIOM_CHECKOUT_SESSION.ensureSession();

      await window.AXIOM_CHECKOUT_SESSION.patchSession({
        cart_items: normalizedCart.map(function (item) {
          return {
            id: item.id || "",
            slug: item.slug || "",
            name: item.name || "Product",
            product_name: item.name || "Product",
            variantLabel: item.variantLabel || "",
            variant_label: item.variantLabel || "",
            variant: item.variant || "",
            quantity: getItemQuantity(item),
            qty: getItemQuantity(item),
            price: Number(item.price || 0),
            unit_price: Number(item.price || 0),
            compareAtPrice:
              item.compareAtPrice !== undefined && item.compareAtPrice !== null
                ? Number(item.compareAtPrice) || null
                : null,
            compare_at_price:
              item.compare_at_price !== undefined && item.compare_at_price !== null
                ? Number(item.compare_at_price) || null
                : item.compareAtPrice !== undefined && item.compareAtPrice !== null
                  ? Number(item.compareAtPrice) || null
                  : null,
            line_total: Number(item.price || 0) * getItemQuantity(item),
            image: item.image || "",
            weightOz: Number(item.weightOz || 0),
            weight_oz: Number(item.weight_oz || item.weightOz || 0),
            inStock: item.inStock !== false,
            in_stock: item.in_stock !== false
          };
        }),
        subtotal: subtotal,
        discount_amount: discountValue,
        shipping_amount: 0,
        tax_amount: 0,
        total_amount: discountedSubtotal,
        session_status: "active",
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to sync cart to checkout session:", error);
    }
  }

  async function prepareCheckoutAndRedirect(event) {
    if (event) {
      event.preventDefault();
    }

    try {
      const cart = getCart().map(normalizeCartItem);

      if (!cart.length) {
        openCart();
        return;
      }

      await syncCartToCheckoutSession(cart);
      window.location.href = getPageLink("checkout/checkout.html");
    } catch (error) {
      console.error("Failed to prepare checkout redirect:", error);
      alert("There was a problem preparing checkout.");
    }
  }

  function renderRecommendations(cart) {
    if (!cartRecommendList || !cartRecommendSection) return;

    const hasBacWater = cart.some(item => item.id === "bacwater-10ml");

    if (hasBacWater) {
      cartRecommendSection.hidden = true;
      cartRecommendList.innerHTML = "";
      return;
    }

    const item = RECOMMENDED_PRODUCTS[0];
    const fallbackCandidates = buildProductImageCandidates(item).slice(1);

    cartRecommendSection.hidden = false;
    cartRecommendList.innerHTML = `
      <div class="cart-recommend-item">
        <img
          src="${item.image}"
          alt="${item.name}"
          data-fallback-index="0"
          data-fallbacks="${fallbackCandidates.join("|")}"
          onerror="window.AXIOM_HANDLE_CART_IMAGE_ERROR(this)"
        >
        <div>
          <p class="cart-recommend-title">${item.name}</p>
          <div class="cart-recommend-price">${formatMoney(item.price)}</div>
        </div>
        <button class="cart-add-small" data-add-recommend="${item.id}">Add</button>
      </div>
    `;

    const addButton = cartRecommendList.querySelector("[data-add-recommend]");
    if (addButton) {
      addButton.onclick = async function () {
        const updatedCart = getCart().map(normalizeCartItem);
        const existing = updatedCart.find(entry => entry.id === item.id);

        if (existing) {
          setItemQuantity(existing, getItemQuantity(existing) + 1);
        } else {
          updatedCart.push({
            id: item.id,
            slug: item.slug,
            name: item.name,
            product_name: item.name,
            variantLabel: item.variantLabel,
            variant_label: item.variantLabel,
            variant: item.variantLabel,
            price: item.price,
            unit_price: item.price,
            compareAtPrice: null,
            compare_at_price: null,
            image: item.image,
            quantity: 1,
            qty: 1,
            line_total: item.price,
            weightOz: item.weightOz,
            weight_oz: item.weightOz,
            inStock: true,
            in_stock: true
          });
        }

        saveCart(updatedCart);
        renderCart();
        await syncCartToCheckoutSession(updatedCart);
        window.dispatchEvent(new Event("axiom-cart-updated"));
      };
    }
  }

  function renderCart() {
    const cart = getCart().map(normalizeCartItem);

    const repairedCart = cart.map(function (item) {
      const imageData = resolveCartItemImageData(item);
      return {
        ...item,
        image: imageData.image,
        imageCandidates: imageData.imageCandidates
      };
    });

    const storedCart = getCart();
    let needsSave = false;

    if (storedCart.length === repairedCart.length) {
      for (let i = 0; i < storedCart.length; i += 1) {
        const oldImage = storedCart[i] && storedCart[i].image ? String(storedCart[i].image) : "";
        const newImage = repairedCart[i] && repairedCart[i].image ? String(repairedCart[i].image) : "";
        if (oldImage !== newImage && newImage) {
          needsSave = true;
          break;
        }
      }
    }

    if (needsSave) {
      saveCart(repairedCart);
    }

    const itemCount = repairedCart.reduce((sum, item) => sum + getItemQuantity(item), 0);
    const subtotalValue = repairedCart.reduce((sum, item) => sum + (item.price * getItemQuantity(item)), 0);
    const discountValue = getDiscountValue(subtotalValue);
    const discountedSubtotal = Math.max(subtotalValue - discountValue, 0);

    const shippingValue = 0;
    const taxValue = 0;
    const totalValue = discountedSubtotal + shippingValue + taxValue;

    const liveCartCount = document.getElementById("cartCount");
    if (liveCartCount) {
      liveCartCount.textContent = String(itemCount);
    }

    if (cartDrawerItemCount) {
      cartDrawerItemCount.textContent = String(itemCount);
    }

    if (!repairedCart.length) {
      if (cartEmptyState) cartEmptyState.hidden = false;
      if (cartItemsList) {
        cartItemsList.hidden = true;
        cartItemsList.innerHTML = "";
      }
    } else {
      if (cartEmptyState) cartEmptyState.hidden = true;

      if (cartItemsList) {
        cartItemsList.hidden = false;
        cartItemsList.innerHTML = repairedCart.map((item, index) => {
          const fallbackCandidates = Array.isArray(item.imageCandidates)
            ? item.imageCandidates.slice(1)
            : [DEFAULT_IMAGE];

          return `
            <div class="cart-item-card">
              <div class="cart-item-image-wrap">
                <img
                  src="${item.image}"
                  alt="${item.name}"
                  data-fallback-index="0"
                  data-fallbacks="${fallbackCandidates.join("|")}"
                  onerror="window.AXIOM_HANDLE_CART_IMAGE_ERROR(this)"
                >
              </div>

              <div class="cart-item-content">
                <div class="cart-item-top">
                  <div>
                    <h3 class="cart-item-name">${item.name}</h3>
                    ${item.variantLabel ? `<p class="cart-item-variant">${item.variantLabel}</p>` : ""}
                  </div>

                  <button class="cart-item-remove" data-remove-index="${index}" aria-label="Remove item">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>

                <div class="cart-item-bottom">
                  <div class="cart-qty">
                    <button type="button" data-decrease-index="${index}">−</button>
                    <span>${getItemQuantity(item)}</span>
                    <button type="button" data-increase-index="${index}">+</button>
                  </div>

                  <div class="cart-item-price-wrap">
                    ${item.compareAtPrice && item.compareAtPrice > item.price ? `<span class="cart-item-old-price">${formatMoney(item.compareAtPrice * getItemQuantity(item))}</span>` : ""}
                    <span class="cart-item-price">${formatMoney(item.price * getItemQuantity(item))}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join("");

        cartItemsList.querySelectorAll("[data-remove-index]").forEach(button => {
          button.onclick = async function () {
            const updatedCart = getCart().map(normalizeCartItem);
            updatedCart.splice(Number(button.dataset.removeIndex), 1);
            saveCart(updatedCart);
            renderCart();
            await syncCartToCheckoutSession(updatedCart);
            window.dispatchEvent(new Event("axiom-cart-updated"));
          };
        });

        cartItemsList.querySelectorAll("[data-increase-index]").forEach(button => {
          button.onclick = async function () {
            const updatedCart = getCart().map(normalizeCartItem);
            const item = updatedCart[Number(button.dataset.increaseIndex)];
            if (!item) return;

            setItemQuantity(item, getItemQuantity(item) + 1);
            saveCart(updatedCart);
            renderCart();
            await syncCartToCheckoutSession(updatedCart);
            window.dispatchEvent(new Event("axiom-cart-updated"));
          };
        });

        cartItemsList.querySelectorAll("[data-decrease-index]").forEach(button => {
          button.onclick = async function () {
            const updatedCart = getCart().map(normalizeCartItem);
            const item = updatedCart[Number(button.dataset.decreaseIndex)];
            if (!item) return;

            const nextQty = getItemQuantity(item) - 1;

            if (nextQty <= 0) {
              updatedCart.splice(Number(button.dataset.decreaseIndex), 1);
            } else {
              setItemQuantity(item, nextQty);
            }

            saveCart(updatedCart);
            renderCart();
            await syncCartToCheckoutSession(updatedCart);
            window.dispatchEvent(new Event("axiom-cart-updated"));
          };
        });
      }
    }

    if (cartSubtotal) cartSubtotal.textContent = formatMoney(subtotalValue);
    if (cartShipping) cartShipping.textContent = "Calculated at checkout";
    if (cartTax) cartTax.textContent = "Calculated at checkout";
    if (cartTotal) cartTotal.textContent = formatMoney(totalValue);

    if (cartDiscountRow && cartDiscountAmount) {
      if (discountValue > 0) {
        cartDiscountRow.hidden = false;
        cartDiscountAmount.textContent = `-${formatMoney(discountValue)}`;
      } else {
        cartDiscountRow.hidden = true;
        cartDiscountAmount.textContent = "-$0.00";
      }
    }

    if (cartProgressText && cartProgressFill) {
      const remaining = Math.max(FREE_SHIPPING_THRESHOLD - discountedSubtotal, 0);
      const progress = Math.min((discountedSubtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

      if (remaining > 0) {
        cartProgressText.innerHTML = `Add <strong>${formatMoney(remaining)}</strong> more to unlock free shipping`;
      } else {
        cartProgressText.innerHTML = `<strong>You unlocked free shipping</strong>`;
      }

      cartProgressFill.style.width = `${progress}%`;
    }

    bindStaticLinks();
    renderRecommendations(repairedCart);
  }

  if (!window.__axiomCartDiscountBound && applyCartDiscount) {
    applyCartDiscount.addEventListener("click", async function () {
      const code = cartDiscountCode ? cartDiscountCode.value.trim().toUpperCase() : "";

      if (code === "SAVE10") {
        saveDiscount({ code, type: "percent", amount: 10 });
        if (cartDiscountMessage) cartDiscountMessage.textContent = "10% discount applied.";
      } else if (code === "SAVE20") {
        saveDiscount({ code, type: "fixed", amount: 20 });
        if (cartDiscountMessage) cartDiscountMessage.textContent = "$20 discount applied.";
      } else if (code === "") {
        saveDiscount(null);
        if (cartDiscountMessage) cartDiscountMessage.textContent = "";
      } else {
        saveDiscount(null);
        if (cartDiscountMessage) cartDiscountMessage.textContent = "Invalid code.";
      }

      renderCart();
      await syncCartToCheckoutSession();
    });

    window.__axiomCartDiscountBound = true;
  }

  if (!window.__axiomCartDelegatedToggleBound) {
    document.addEventListener("click", function (event) {
      const cartToggle = event.target.closest("#cartToggle");
      if (!cartToggle) return;

      event.preventDefault();
      openCart();
    });

    window.__axiomCartDelegatedToggleBound = true;
  }

  if (!window.__axiomCheckoutDelegatedBound) {
    document.addEventListener("click", function (event) {
      const checkoutLink = event.target.closest('.cart-action-stack a[href*="checkout"]');
      if (!checkoutLink) return;

      prepareCheckoutAndRedirect(event);
    });

    window.__axiomCheckoutDelegatedBound = true;
  }

  if (cartClose && !cartClose.dataset.cartBound) {
    cartClose.addEventListener("click", closeCart);
    cartClose.dataset.cartBound = "true";
  }

  if (overlay && !overlay.dataset.cartBound) {
    overlay.addEventListener("click", closeCart);
    overlay.dataset.cartBound = "true";
  }

  if (!window.__axiomCartEscapeBound) {
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeCart();
      }
    });

    window.__axiomCartEscapeBound = true;
  }

  window.openCartDrawer = openCart;
  window.closeCartDrawer = closeCart;
  window.renderCartDrawer = renderCart;

  if (!window.__axiomCartUpdatedBound) {
    window.addEventListener("axiom-cart-updated", renderCart);
    window.addEventListener("storage", renderCart);
    window.__axiomCartUpdatedBound = true;
  }

  renderCart();
}

document.addEventListener("DOMContentLoaded", function () {
  initCartDrawer();
});

document.addEventListener("cartDrawerLoaded", function () {
  initCartDrawer();
});
