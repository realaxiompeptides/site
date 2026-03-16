window.AXIOM_CART_SESSION = {
  getNormalizedCart() {
    const cart = window.AXIOM_HELPERS.getCart();

    return cart.map(function (item) {
      return {
        id: item.id || "",
        slug: item.slug || "",
        name: item.name || "Product",
        variant_label: item.variantLabel || item.variant || "",
        price: Number(item.price || 0),
        compare_at_price:
          item.compareAtPrice !== undefined && item.compareAtPrice !== null
            ? Number(item.compareAtPrice || 0)
            : null,
        quantity: Number(item.quantity || item.qty || 1),
        image: item.image || "",
        weight_oz: Number(item.weightOz || 0),
        in_stock: item.inStock !== false
      };
    });
  },

  getCartTotals() {
    const items = window.AXIOM_CART_SESSION.getNormalizedCart();

    const subtotal = items.reduce(function (sum, item) {
      return sum + item.price * item.quantity;
    }, 0);

    return {
      items,
      subtotal
    };
  },

  async sync(options = {}) {
    if (!window.AXIOM_CHECKOUT_SESSION) return;

    const totals = window.AXIOM_CART_SESSION.getCartTotals();

    const shippingSelection = options.shippingSelection ?? null;
    const shippingAmount = Number(options.shippingAmount ?? 0);
    const taxAmount = Number(options.taxAmount ?? 0);

    await window.AXIOM_CHECKOUT_SESSION.patchSession({
      cart_items: totals.items,
      subtotal: totals.subtotal,
      shipping_selection: shippingSelection,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total_amount: totals.subtotal + shippingAmount + taxAmount
    });
  }
};

window.addEventListener("axiom-cart-updated", function () {
  window.AXIOM_CART_SESSION.sync();
});
