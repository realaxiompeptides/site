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
  const isProductPage = window.location.pathname.includes("/product-page/");
  const IMAGE_PREFIX = isProductPage ? "../" : "";

  const RECOMMENDED_PRODUCTS = [
    {
      id: "bacwater-10ml",
      slug: "bac-water",
      name: "BAC Water (10ML)",
      price: 10,
      image: `${IMAGE_PREFIX}images/products/bac-water-10ml-main.PNG`,
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

  function normalizeImagePath(path) {
    if (!path || typeof path !== "string") {
      return `${IMAGE_PREFIX}images/products/placeholder.PNG`;
    }

    const cleanPath = path.trim();

    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      return cleanPath;
    }

    if (cleanPath.startsWith("/")) {
      return cleanPath;
    }

    if (isProductPage) {
      if (cleanPath.startsWith("../")) return cleanPath;
      if (cleanPath.startsWith("./")) return cleanPath.replace("./", "../");
      return `../${cleanPath}`;
    }

    if (cleanPath.startsWith("../")) {
      return cleanPath.replace("../", "");
    }

    if (cleanPath.startsWith("./")) {
      return cleanPath.replace("./", "");
    }

    return cleanPath;
  }

  function normalizeCartItem(item) {
    const normalizedQty = getItemQuantity(item);

    return {
      id: item.id,
      slug: item.slug || "",
      name: item.name || "Product",
      variantLabel: item.variantLabel || item.variant || "",
      price: Number(item.price) || 0,
      compareAtPrice:
        item.compareAtPrice !== undefined && item.compareAtPrice !== null
          ? Number(item.compareAtPrice) || null
          : item.oldPrice !== undefined && item.oldPrice !== null
            ? Number(item.oldPrice) || null
            : null,
      image: normalizeImagePath(item.image || ""),
      quantity: normalizedQty,
      qty: normalizedQty,
      weightOz:
        item.weightOz !== undefined && item.weightOz !== null
          ? Number(item.weightOz) || 0
          : item.id === "bacwater-10ml"
            ? 9.6
            : 0.188,
      inStock: item.inStock !== false
    };
  }

  function getPageLink(pathFromRoot) {
    return isProductPage ? `../${pathFromRoot}` : pathFromRoot;
  }

  function bindStaticLinks() {
    const browseProductsLinks = document.querySelectorAll('.cart-empty-state a[href], .cart-outline-btn[href*="catalog"]');
    const viewCartLinks = document.querySelectorAll('.cart-action-stack a[href*="cart-page"]');
    const checkoutLinks = document.querySelectorAll('.cart-action-stack a[href*="checkout"]');

    browseProductsLinks.forEach(link => {
      if (link.closest(".cart-empty-state")) {
        link.setAttribute("href", getPageLink("catalog.html"));
      }
    });

    viewCartLinks.forEach(link => {
      link.setAttribute("href", getPageLink("cart/cart-page.html"));
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

  function renderRecommendations(cart) {
    if (!cartRecommendList || !cartRecommendSection) return;

    const hasBacWater = cart.some(item => item.id === "bacwater-10ml");

    if (hasBacWater) {
      cartRecommendSection.hidden = true;
      cartRecommendList.innerHTML = "";
      return;
    }

    const item = RECOMMENDED_PRODUCTS[0];

    cartRecommendSection.hidden = false;
    cartRecommendList.innerHTML = `
      <div class="cart-recommend-item">
        <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='${IMAGE_PREFIX}images/products/placeholder.PNG';">
        <div>
          <p class="cart-recommend-title">${item.name}</p>
          <div class="cart-recommend-price">${formatMoney(item.price)}</div>
        </div>
        <button class="cart-add-small" data-add-recommend="${item.id}">Add</button>
      </div>
    `;

    const addButton = cartRecommendList.querySelector("[data-add-recommend]");
    if (addButton) {
      addButton.onclick = function () {
        const updatedCart = getCart().map(normalizeCartItem);
        const existing = updatedCart.find(entry => entry.id === item.id);

        if (existing) {
          setItemQuantity(existing, getItemQuantity(existing) + 1);
        } else {
          updatedCart.push({
            id: item.id,
            slug: item.slug,
            name: item.name,
            variantLabel: item.variantLabel,
            price: item.price,
            compareAtPrice: null,
            image: item.image,
            quantity: 1,
            qty: 1,
            weightOz: item.weightOz,
            inStock: true
          });
        }

        saveCart(updatedCart);
        renderCart();
        window.dispatchEvent(new Event("axiom-cart-updated"));
      };
    }
  }

  function renderCart() {
    const cart = getCart().map(normalizeCartItem);

    const itemCount = cart.reduce((sum, item) => sum + getItemQuantity(item), 0);
    const subtotalValue = cart.reduce((sum, item) => sum + (item.price * getItemQuantity(item)), 0);
    const discountValue = getDiscountValue(subtotalValue);
    const discountedSubtotal = Math.max(subtotalValue - discountValue, 0);

    const shippingValue = 0;
    const taxValue = 0;
    const totalValue = discountedSubtotal + shippingValue + taxValue;

    const liveCartCount = document.getElementById("cartCount");
    if (liveCartCount) liveCartCount.textContent = String(itemCount);
    if (cartDrawerItemCount) cartDrawerItemCount.textContent = String(itemCount);

    if (!cart.length) {
      if (cartEmptyState) cartEmptyState.hidden = false;
      if (cartItemsList) {
        cartItemsList.hidden = true;
        cartItemsList.innerHTML = "";
      }
    } else {
      if (cartEmptyState) cartEmptyState.hidden = true;

      if (cartItemsList) {
        cartItemsList.hidden = false;
        cartItemsList.innerHTML = cart.map((item, index) => `
          <div class="cart-item-card">
            <div class="cart-item-image-wrap">
              <img
                src="${item.image}"
                alt="${item.name}"
                onerror="this.onerror=null;this.src='${IMAGE_PREFIX}images/products/placeholder.PNG';"
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
        `).join("");

        cartItemsList.querySelectorAll("[data-remove-index]").forEach(button => {
          button.onclick = function () {
            const updatedCart = getCart().map(normalizeCartItem);
            updatedCart.splice(Number(button.dataset.removeIndex), 1);
            saveCart(updatedCart);
            renderCart();
            window.dispatchEvent(new Event("axiom-cart-updated"));
          };
        });

        cartItemsList.querySelectorAll("[data-increase-index]").forEach(button => {
          button.onclick = function () {
            const updatedCart = getCart().map(normalizeCartItem);
            const item = updatedCart[Number(button.dataset.increaseIndex)];
            if (!item) return;

            setItemQuantity(item, getItemQuantity(item) + 1);
            saveCart(updatedCart);
            renderCart();
            window.dispatchEvent(new Event("axiom-cart-updated"));
          };
        });

        cartItemsList.querySelectorAll("[data-decrease-index]").forEach(button => {
          button.onclick = function () {
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
    renderRecommendations(cart);
  }

  if (!window.__axiomCartDiscountBound && applyCartDiscount) {
    applyCartDiscount.addEventListener("click", function () {
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
