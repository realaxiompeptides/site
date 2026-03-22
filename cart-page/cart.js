window.AXIOM_CART_PAGE = {
  storageKey: "axiom_cart",
  discountStorageKey: "axiom_cart_discount",

  async init() {
    this.bindEvents();
    this.render();
    this.syncHeaderCartCount();
    this.syncCartDrawer();
    this.initCouponBox();
    await this.syncDiscountToCheckoutSession();
  },

  bindEvents() {
    const clearBtn = document.getElementById("clearCartBtn");
    const checkoutBtn = document.getElementById("cartCheckoutBtn");
    const applyCouponBtn = document.getElementById("cartPageApplyCouponBtn");
    const couponInput = document.getElementById("cartPageCouponCode");

    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = "true";
      clearBtn.addEventListener("click", () => {
        const confirmed = window.confirm("Clear all items from your cart?");
        if (!confirmed) return;
        this.saveCart([]);
        this.saveDiscount(null);
        this.render();
      });
    }

    if (checkoutBtn && !checkoutBtn.dataset.bound) {
      checkoutBtn.dataset.bound = "true";
      checkoutBtn.addEventListener("click", () => {
        this.goToCheckout();
      });
    }

    if (applyCouponBtn && !applyCouponBtn.dataset.bound) {
      applyCouponBtn.dataset.bound = "true";
      applyCouponBtn.addEventListener("click", async () => {
        await this.applyCoupon();
      });
    }

    if (couponInput && !couponInput.dataset.bound) {
      couponInput.dataset.bound = "true";
      couponInput.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          await this.applyCoupon();
        }
      });
    }

    if (!document.body.dataset.axiomCartPageDelegated) {
      document.body.dataset.axiomCartPageDelegated = "true";

      document.addEventListener("click", (event) => {
        const minusBtn = event.target.closest("[data-cart-minus]");
        const plusBtn = event.target.closest("[data-cart-plus]");
        const removeBtn = event.target.closest("[data-cart-remove]");

        if (minusBtn) {
          const index = Number(minusBtn.getAttribute("data-cart-minus"));
          this.changeQuantity(index, -1);
          return;
        }

        if (plusBtn) {
          const index = Number(plusBtn.getAttribute("data-cart-plus"));
          this.changeQuantity(index, 1);
          return;
        }

        if (removeBtn) {
          const index = Number(removeBtn.getAttribute("data-cart-remove"));
          this.removeItem(index);
        }
      });
    }

    if (!window.__axiomCartPageStorageBound) {
      window.__axiomCartPageStorageBound = true;

      window.addEventListener("storage", async (event) => {
        if (
          event.key === this.storageKey ||
          event.key === this.discountStorageKey
        ) {
          this.render();
          await this.syncDiscountToCheckoutSession();
        }
      });
    }

    if (!window.__axiomCartPageUpdatedBound) {
      window.__axiomCartPageUpdatedBound = true;

      window.addEventListener("axiom-cart-updated", async () => {
        this.render();
        await this.syncDiscountToCheckoutSession();
      });
    }
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
    } catch (error) {
      console.error("Failed to read cart from storage:", error);
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

  getStoredDiscount() {
    try {
      const raw = localStorage.getItem(this.discountStorageKey);
      const parsed = JSON.parse(raw || "null");

      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return {
        code: this.normalizeDiscountCode(parsed.code || ""),
        discountAmount: this.toNumber(parsed.discountAmount, 0),
        discountType: String(parsed.discountType || ""),
        discountValue: this.toNumber(parsed.discountValue, 0),
        description: String(parsed.description || ""),
        minSubtotal: this.toNumber(parsed.minSubtotal, 0),
        isApplied: parsed.isApplied === true
      };
    } catch (error) {
      console.error("Failed to read stored discount:", error);
      return null;
    }
  },

  saveDiscount(discount) {
    try {
      if (!discount) {
        localStorage.removeItem(this.discountStorageKey);
        return;
      }

      localStorage.setItem(
        this.discountStorageKey,
        JSON.stringify({
          code: this.normalizeDiscountCode(discount.code || ""),
          discountAmount: this.toNumber(discount.discountAmount, 0),
          discountType: String(discount.discountType || ""),
          discountValue: this.toNumber(discount.discountValue, 0),
          description: String(discount.description || ""),
          minSubtotal: this.toNumber(discount.minSubtotal, 0),
          isApplied: discount.isApplied === true
        })
      );
    } catch (error) {
      console.error("Failed to save discount:", error);
    }
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
      if (el) {
        el.textContent = String(count);
      }
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

  toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  },

  normalizeDiscountCode(value) {
    return String(value || "").trim().toUpperCase();
  },

  getSubtotal(cart = this.getCart()) {
    return cart.reduce((sum, item) => {
      return sum + this.getItemLineTotal(item);
    }, 0);
  },

  getTotalItems(cart = this.getCart()) {
    return cart.reduce((sum, item) => {
      return sum + this.getItemQuantity(item);
    }, 0);
  },

  getEffectiveDiscount(subtotal) {
    const stored = this.getStoredDiscount();

    if (!stored || stored.isApplied !== true) {
      return {
        code: "",
        amount: 0,
        isApplied: false
      };
    }

    if (subtotal < this.toNumber(stored.minSubtotal, 0)) {
      this.saveDiscount(null);
      this.setCouponMessage(
        "Coupon removed because your cart no longer meets the minimum subtotal.",
        "error"
      );

      return {
        code: "",
        amount: 0,
        isApplied: false
      };
    }

    return {
      code: this.normalizeDiscountCode(stored.code || ""),
      amount: Math.min(this.toNumber(stored.discountAmount, 0), subtotal),
      isApplied: true
    };
  },

  setCouponMessage(message, type = "") {
    const el = document.getElementById("cartPageCouponMessage");
    if (!el) return;

    el.textContent = message || "";
    el.classList.remove("success", "error", "muted");

    if (type) {
      el.classList.add(type);
    }
  },

  calculateDiscountAmount(discountRow, subtotal) {
    const discountType = String(discountRow?.discount_type || "").toLowerCase();
    const discountValue = this.toNumber(discountRow?.discount_value, 0);

    let amount = 0;

    if (discountType === "percent") {
      amount = subtotal * (discountValue / 100);
    } else if (discountType === "fixed") {
      amount = discountValue;
    }

    return Math.max(0, Math.min(amount, subtotal));
  },

  async applyCoupon() {
    const inputEl = document.getElementById("cartPageCouponCode");
    const btnEl = document.getElementById("cartPageApplyCouponBtn");
    const subtotal = this.getSubtotal();
    const code = this.normalizeDiscountCode(inputEl?.value || "");

    if (!inputEl || !btnEl) return;

    if (!code) {
      this.saveDiscount(null);
      this.render();
      this.setCouponMessage("Enter a coupon code.", "error");
      await this.syncDiscountToCheckoutSession();
      return;
    }

    if (!window.axiomSupabase) {
      this.setCouponMessage("Coupon validation is temporarily unavailable.", "error");
      return;
    }

    btnEl.disabled = true;
    btnEl.textContent = "Applying...";

    try {
      const { data, error } = await window.axiomSupabase
        .from("discount_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Failed to validate coupon:", error);
        this.setCouponMessage("We could not validate that coupon right now.", "error");
        return;
      }

      if (!data) {
        this.saveDiscount(null);
        this.render();
        this.setCouponMessage("That coupon code is invalid.", "error");
        await this.syncDiscountToCheckoutSession();
        return;
      }

      const now = new Date();
      const startsAt = data.starts_at ? new Date(data.starts_at) : null;
      const endsAt = data.ends_at ? new Date(data.ends_at) : null;
      const minSubtotal = this.toNumber(data.min_subtotal, 0);
      const maxUses = data.max_uses !== null && data.max_uses !== undefined
        ? Number(data.max_uses)
        : null;
      const timesUsed = this.toNumber(data.times_used, 0);

      if (startsAt && now < startsAt) {
        this.setCouponMessage("That coupon is not active yet.", "error");
        return;
      }

      if (endsAt && now > endsAt) {
        this.setCouponMessage("That coupon has expired.", "error");
        return;
      }

      if (maxUses !== null && timesUsed >= maxUses) {
        this.setCouponMessage("That coupon has reached its usage limit.", "error");
        return;
      }

      if (subtotal < minSubtotal) {
        this.setCouponMessage(
          `This coupon requires a subtotal of ${this.formatMoney(minSubtotal)} or more.`,
          "error"
        );
        return;
      }

      const discountAmount = this.calculateDiscountAmount(data, subtotal);

      if (discountAmount <= 0) {
        this.setCouponMessage("That coupon does not apply to this cart.", "error");
        return;
      }

      this.saveDiscount({
        code: code,
        discountAmount: discountAmount,
        discountType: String(data.discount_type || ""),
        discountValue: this.toNumber(data.discount_value, 0),
        description: String(data.description || ""),
        minSubtotal: minSubtotal,
        isApplied: true
      });

      this.render();
      this.setCouponMessage(`Coupon ${code} applied successfully.`, "success");
      await this.syncDiscountToCheckoutSession();

      window.dispatchEvent(new CustomEvent("axiom-discount-updated", {
        detail: {
          code: code,
          discountAmount: discountAmount
        }
      }));
    } catch (error) {
      console.error("Coupon apply failed:", error);
      this.setCouponMessage("We could not apply that coupon right now.", "error");
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = "Apply Coupon";
    }
  },

  initCouponBox() {
    const inputEl = document.getElementById("cartPageCouponCode");
    const stored = this.getStoredDiscount();

    if (inputEl && stored?.isApplied && stored.code && !inputEl.value) {
      inputEl.value = stored.code;
    }

    this.render();
  },

  async syncDiscountToCheckoutSession() {
    try {
      const cart = this.getCart();
      const subtotal = this.getSubtotal(cart);
      const effectiveDiscount = this.getEffectiveDiscount(subtotal);
      const discountAmount = effectiveDiscount.amount;
      const discountCode = effectiveDiscount.isApplied ? effectiveDiscount.code : "";
      const totalAmount = Math.max(0, subtotal - discountAmount);

      if (
        window.AXIOM_CHECKOUT_SESSION &&
        typeof window.AXIOM_CHECKOUT_SESSION.ensureSession === "function" &&
        typeof window.AXIOM_CHECKOUT_SESSION.patchSession === "function"
      ) {
        const sessionId = await window.AXIOM_CHECKOUT_SESSION.ensureSession();
        if (!sessionId) return;

        const cartItemsForSession = cart.map((item) => {
          const quantity = this.getItemQuantity(item);
          const price = this.getItemUnitPrice(item);
          const weightOz = Number(item.weightOz || item.weight_oz || 0);

          return {
            id: item.id || "",
            slug: item.slug || "",
            name: this.getItemName(item),
            product_name: this.getItemName(item),
            variantLabel: this.getItemVariant(item),
            variant_label: this.getItemVariant(item),
            variant: this.getItemVariant(item),
            price: price,
            unit_price: price,
            compareAtPrice:
              item.compareAtPrice !== undefined && item.compareAtPrice !== null
                ? Number(item.compareAtPrice) || null
                : item.compare_at_price !== undefined && item.compare_at_price !== null
                  ? Number(item.compare_at_price) || null
                  : null,
            compare_at_price:
              item.compare_at_price !== undefined && item.compare_at_price !== null
                ? Number(item.compare_at_price) || null
                : item.compareAtPrice !== undefined && item.compareAtPrice !== null
                  ? Number(item.compareAtPrice) || null
                  : null,
            quantity: quantity,
            qty: quantity,
            line_total: price * quantity,
            image: item.image || "",
            weightOz: weightOz,
            weight_oz: weightOz,
            inStock: item.inStock !== false && item.in_stock !== false,
            in_stock: item.inStock !== false && item.in_stock !== false
          };
        });

        await window.AXIOM_CHECKOUT_SESSION.patchSession({
          cart_items: cartItemsForSession,
          subtotal: subtotal,
          discount_amount: discountAmount,
          discount_code: discountCode || null,
          total_amount: totalAmount,
          session_status: "active"
        });
      }
    } catch (error) {
      console.error("Failed to sync discount to checkout session:", error);
    }
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
    this.syncDiscountToCheckoutSession();
  },

  removeItem(index) {
    const cart = this.getCart();
    if (!cart[index]) return;

    cart.splice(index, 1);
    this.saveCart(cart);
    this.render();
    this.syncDiscountToCheckoutSession();
  },

  renderSummary(cart) {
    const totalItems = this.getTotalItems(cart);
    const subtotal = this.getSubtotal(cart);
    const effectiveDiscount = this.getEffectiveDiscount(subtotal);
    const total = Math.max(0, subtotal - effectiveDiscount.amount);

    const itemsEl = document.getElementById("cartSummaryItemsCount");
    const subtotalEl = document.getElementById("cartSummarySubtotal");
    const totalEl = document.getElementById("cartSummaryTotal");
    const discountRowEl = document.getElementById("cartPageDiscountRow");
    const discountAmountEl = document.getElementById("cartPageDiscountAmount");
    const couponInputEl = document.getElementById("cartPageCouponCode");

    if (itemsEl) itemsEl.textContent = String(totalItems);
    if (subtotalEl) subtotalEl.textContent = this.formatMoney(subtotal);
    if (totalEl) totalEl.textContent = this.formatMoney(total);

    if (discountRowEl && discountAmountEl) {
      if (effectiveDiscount.isApplied && effectiveDiscount.amount > 0) {
        discountRowEl.hidden = false;
        discountAmountEl.textContent = `-${this.formatMoney(effectiveDiscount.amount)}`;
      } else {
        discountRowEl.hidden = true;
        discountAmountEl.textContent = "-$0.00";
      }
    }

    if (couponInputEl && effectiveDiscount.isApplied && effectiveDiscount.code && !couponInputEl.value) {
      couponInputEl.value = effectiveDiscount.code;
    }
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
      const unitPrice = this.getItemUnitPrice(item);

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
              <p>Unit Price: ${this.formatMoney(unitPrice)}</p>
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

    window.location.href = "https://realaxiompeptides.github.io/site/checkout/checkout.html";
  }
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.AXIOM_CART_PAGE) {
    window.AXIOM_CART_PAGE.init();
  }
});
