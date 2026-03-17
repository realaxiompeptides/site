window.AXIOM_CART_CHECKOUT_SYNC = {
  getCart() {
    try {
      const saved = localStorage.getItem("axiom_cart");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to read axiom_cart:", error);
      return [];
    }
  },

  getItemQuantity(item) {
    return Number(item.quantity || item.qty || 1);
  },

  getItemPrice(item) {
    return Number(item.price || item.unit_price || item.variantPrice || 0);
  },

  getItemName(item) {
    return item.name || item.product_name || item.productName || "Product";
  },

  getItemVariant(item) {
    return item.variant_label || item.variantLabel || item.variant || item.option || "";
  },

  normalizeCartItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const quantity = this.getItemQuantity(item);
      const price = this.getItemPrice(item);
      const variant = this.getItemVariant(item);

      return {
        id: item.id || "",
        slug: item.slug || "",
        name: this.getItemName(item),
        product_name: this.getItemName(item),
        variantLabel: variant,
        variant_label: variant,
        variant: variant,
        quantity: quantity,
        qty: quantity,
        price: price,
        unit_price: price,
        compareAtPrice:
          item.compareAtPrice !== undefined && item.compareAtPrice !== null
            ? Number(item.compareAtPrice) || null
            : item.compare_at_price !== undefined && item.compare_at_price !== null
              ? Number(item.compare_at_price) || null
              : item.oldPrice !== undefined && item.oldPrice !== null
                ? Number(item.oldPrice) || null
                : null,
        compare_at_price:
          item.compare_at_price !== undefined && item.compare_at_price !== null
            ? Number(item.compare_at_price) || null
            : item.compareAtPrice !== undefined && item.compareAtPrice !== null
              ? Number(item.compareAtPrice) || null
              : item.oldPrice !== undefined && item.oldPrice !== null
                ? Number(item.oldPrice) || null
                : null,
        line_total: price * quantity,
        image: item.image || "",
        weightOz: Number(item.weightOz || item.weight_oz || 0),
        weight_oz: Number(item.weight_oz || item.weightOz || 0),
        inStock: item.inStock !== false && item.in_stock !== false,
        in_stock: item.inStock !== false && item.in_stock !== false
      };
    });
  },

  getSubtotal(items) {
    return items.reduce((sum, item) => {
      return sum + (this.getItemPrice(item) * this.getItemQuantity(item));
    }, 0);
  },

  async syncToSession(extraPayload = {}) {
    try {
      if (
        !window.AXIOM_CHECKOUT_SESSION ||
        typeof window.AXIOM_CHECKOUT_SESSION.ensureSession !== "function" ||
        typeof window.AXIOM_CHECKOUT_SESSION.patchSession !== "function"
      ) {
        console.error("AXIOM_CHECKOUT_SESSION is missing.");
        return false;
      }

      const rawCart = this.getCart();
      const cartItems = this.normalizeCartItems(rawCart);
      const subtotal = this.getSubtotal(cartItems);

      await window.AXIOM_CHECKOUT_SESSION.ensureSession();

      await window.AXIOM_CHECKOUT_SESSION.patchSession({
        cart_items: cartItems,
        subtotal: subtotal,
        total_amount: subtotal,
        shipping_amount: Number(extraPayload.shipping_amount || 0),
        tax_amount: Number(extraPayload.tax_amount || 0),
        last_activity_at: new Date().toISOString(),
        ...extraPayload
      });

      return true;
    } catch (error) {
      console.error("Failed to sync cart to checkout session:", error);
      return false;
    }
  }
};
