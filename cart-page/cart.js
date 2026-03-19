window.AXIOM_CART_PAGE = {
  storageKey: "axiom_cart",

  async init() {
    await this.loadSharedLayout();
    this.bindEvents();
    this.render();
    this.syncHeaderCartCount();
  },

  async loadSharedLayout() {
    await Promise.all([
      this.loadPartial("../announcement-bar.html", "announcementBarMount"),
      this.loadPartial("../header.html", "siteHeaderMount"),
      this.loadPartial("../footer.html", "siteFooterMount")
    ]);
  },

  async loadPartial(url, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      mount.innerHTML = await response.text();
    } catch (error) {
      console.error(error);
    }
  },

  bindEvents() {
    const clearBtn = document.getElementById("clearCartBtn");
    const checkoutBtn = document.getElementById("cartCheckoutBtn");

    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = "true";
      clearBtn.addEventListener("click", () => {
        const confirmed = window.confirm("Clear all items from your cart?");
        if (!confirmed) return;
        this.saveCart([]);
        this.render();
      });
    }

    if (checkoutBtn && !checkoutBtn.dataset.bound) {
      checkoutBtn.dataset.bound = "true";
      checkoutBtn.addEventListener("click", () => {
        this.goToCheckout();
      });
    }

    document.addEventListener("click", (event) => {
      const minusBtn = event.target.closest("[data-cart-minus]");
      const plusBtn = event.target.closest("[data-cart-plus]");
      const removeBtn = event.target.closest("[data-cart-remove]");

      if (minusBtn) {
        const index = Number(minusBtn.getAttribute("data-cart-minus"));
        this.changeQuantity(index, -1);
      }

      if (plusBtn) {
        const index = Number(plusBtn.getAttribute("data-cart-plus"));
        this.changeQuantity(index, 1);
      }

      if (removeBtn) {
        const index = Number(removeBtn.getAttribute("data-cart-remove"));
        this.removeItem(index);
      }
    });
  },

  getCart() {
    if (
      window.AXIOM_CART &&
      typeof window.AXIOM_CART.getCart === "function"
    ) {
      const sharedCart = window.AXIOM_CART.getCart();
      return Array.isArray(sharedCart) ? sharedCart : [];
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveCart(cart) {
    const safeCart = Array.isArray(cart) ? cart : [];

    if (
      window.AXIOM_CART &&
      typeof window.AXIOM_CART.saveCart === "function"
    ) {
      window.AXIOM_CART.saveCart(safeCart);
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(safeCart));
    }

    this.syncHeaderCartCount();
    this.syncCartDrawer();
  },

  syncHeaderCartCount() {
    const cart = this.getCart();
    const count = cart.reduce((sum, item) => {
      return sum + Number(item.quantity || item.qty || 0);
    }, 0);

    const badgeIds = [
      "cartCount",
      "mobileCartCount",
      "cartDrawerItemCount",
      "headerCartCount"
    ];

    badgeIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(count);
    });
  },

  syncCartDrawer() {
    if (
      window.AXIOM_CART &&
      typeof window.AXIOM_CART.renderDrawer === "function"
    ) {
      window.AXIOM_CART.renderDrawer();
      return;
    }

    if (
      window.AXIOM_CART_DRAWER &&
      typeof window.AXIOM_CART_DRAWER.render === "function"
    ) {
      window.AXIOM_CART_DRAWER.render();
    }
  },

  getItemQuantity(item) {
    return Number(item.quantity || item.qty || 1);
  },

  getItemUnitPrice(item) {
    return Number(
      item.unit_price ??
      item.unitPrice ??
      item.price ??
      0
    );
  },

  getItemLineTotal(item) {
    if (item.line_total !== undefined && item.line_total !== null) {
      return Number(item.line_total || 0);
    }

    return this.getItemUnitPrice(item) * this.getItemQuantity(item);
  },

  getItemName(item) {
    return item.product_name || item.name || "Product";
  },

  getItemVariant(item) {
    return item.variant_label || item.variantLabel || item.variant || "Default";
  },

  getItemImage(item) {
    return item.image || "../images/products/placeholder.PNG";
  },

  formatMoney(value) {
    if (
      window.AXIOM_HELPERS &&
      typeof window.AXIOM_HELPERS.formatMoney === "function"
    ) {
      return window.AXIOM_HELPERS.formatMoney(value);
    }

    return `$${Number(value || 0).toFixed(2)}`;
  },

  changeQuantity(index, delta) {
    const cart = this.getCart();
    if (!cart[index]) return;

    const currentQty = this.getItemQuantity(cart[index]);
    const nextQty = currentQty + delta;

    if (nextQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = nextQty;
      cart[index].qty = nextQty;
      cart[index].line_total = this.getItemUnitPrice(cart[index]) * nextQty;
    }

    this.saveCart(cart);
    this.render();
  },

  removeItem(index) {
    const cart = this.getCart();
    if (!cart[index]) return;

    cart.splice(index, 1);
    this.saveCart(cart);
    this.render();
  },

  renderSummary(cart) {
    const totalItems = cart.reduce((sum, item) => sum + this.getItemQuantity(item), 0);
    const subtotal = cart.reduce((sum, item) => sum + this.getItemLineTotal(item), 0);

    const itemsEl = document.getElementById("cartSummaryItemsCount");
    const subtotalEl = document.getElementById("cartSummarySubtotal");
    const totalEl = document.getElementById("cartSummaryTotal");

    if (itemsEl) itemsEl.textContent = String(totalItems);
    if (subtotalEl) subtotalEl.textContent = this.formatMoney(subtotal);
    if (totalEl) totalEl.textContent = this.formatMoney(subtotal);
  },

  renderItems(cart) {
    const wrap = document.getElementById("cartPageItemsWrap");
    if (!wrap) return;

    if (!cart.length) {
      wrap.innerHTML = `
        <div class="cart-empty-state">
          Your cart is empty.
        </div>
      `;
      return;
    }

    wrap.innerHTML = cart.map((item, index) => {
      const name = this.getItemName(item);
      const variant = this.getItemVariant(item);
      const quantity = this.getItemQuantity(item);
      const lineTotal = this.getItemLineTotal(item);
      const image = this.getItemImage(item);

      return `
        <article class="cart-item-row">
          <div class="cart-item-image">
            <img
              src="${image}"
              alt="${name}"
              onerror="this.onerror=null;this.src='../images/products/placeholder.PNG';"
            />
          </div>

          <div class="cart-item-info">
            <h3>${name}</h3>

            <div class="cart-item-meta">
              <p>Variant: ${variant}</p>
              <p>Unit Price: ${this.formatMoney(this.getItemUnitPrice(item))}</p>
            </div>
          </div>

          <div class="cart-item-actions">
            <div class="cart-item-price">${this.formatMoney(lineTotal)}</div>

            <div class="cart-qty-controls">
              <button type="button" class="cart-qty-btn" data-cart-minus="${index}">−</button>
              <span class="cart-qty-value">${quantity}</span>
              <button type="button" class="cart-qty-btn" data-cart-plus="${index}">+</button>
            </div>

            <button type="button" class="cart-remove-btn" data-cart-remove="${index}">
              Remove
            </button>
          </div>
        </article>
      `;
    }).join("");
  },

  render() {
    const cart = this.getCart();
    this.renderItems(cart);
    this.renderSummary(cart);
    this.syncHeaderCartCount();
  },

  goToCheckout() {
    const cart = this.getCart();

    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to persist cart before checkout:", error);
    }

    window.location.href = "../checkout.html";
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.AXIOM_CART_PAGE) {
    window.AXIOM_CART_PAGE.init();
  }
});
