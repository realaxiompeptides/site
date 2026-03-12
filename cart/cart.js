document.addEventListener("DOMContentLoaded", () => {
  const cartToggle = document.getElementById("cartToggle");
  const cartClose = document.getElementById("cartClose");
  const cartDrawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("siteOverlay");

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

  const FREE_SHIPPING_THRESHOLD = 150;
  const TAX_RATE = 0.08;

  const RECOMMENDED_PRODUCTS = [
    {
      id: "bac-water-10ml",
      name: "BAC Water (10ML)",
      price: 10,
      image: "images/products/bac-water-10ml-main.PNG",
      variant: "10ML"
    },
    {
      id: "bpc-157-5mg",
      name: "BPC-157",
      price: 25,
      image: "images/products/bpc-157-5mg-main.PNG",
      variant: "5MG"
    }
  ];

  function getCart() {
    return JSON.parse(localStorage.getItem("axiomCart") || "[]");
  }

  function saveCart(cart) {
    localStorage.setItem("axiomCart", JSON.stringify(cart));
  }

  function getDiscount() {
    return JSON.parse(localStorage.getItem("axiomDiscount") || "null");
  }

  function saveDiscount(discount) {
    localStorage.setItem("axiomDiscount", JSON.stringify(discount));
  }

  function formatMoney(value) {
    return `$${value.toFixed(2)}`;
  }

  function openCart() {
    if (!cartDrawer || !overlay) return;
    cartDrawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    cartToggle?.setAttribute("aria-expanded", "true");
    cartDrawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    if (!cartDrawer || !overlay) return;
    cartDrawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    cartToggle?.setAttribute("aria-expanded", "false");
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

    const cartIds = cart.map(item => item.id);
    const items = RECOMMENDED_PRODUCTS.filter(product => !cartIds.includes(product.id));

    if (!items.length) {
      cartRecommendSection.hidden = true;
      cartRecommendList.innerHTML = "";
      return;
    }

    cartRecommendSection.hidden = false;
    cartRecommendList.innerHTML = items.map(item => `
      <div class="cart-recommend-item">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <p class="cart-recommend-title">${item.name}</p>
          <div class="cart-recommend-price">${formatMoney(item.price)}</div>
        </div>
        <button class="cart-add-small" data-add-recommend="${item.id}">Add</button>
      </div>
    `).join("");

    cartRecommendList.querySelectorAll("[data-add-recommend]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-add-recommend");
        const product = RECOMMENDED_PRODUCTS.find(item => item.id === id);
        if (!product) return;

        const updatedCart = getCart();
        const existing = updatedCart.find(item => item.id === product.id);

        if (existing) {
          existing.qty += 1;
        } else {
          updatedCart.push({
            id: product.id,
            name: product.name,
            variant: product.variant,
            price: product.price,
            oldPrice: null,
            image: product.image,
            qty: 1
          });
        }

        saveCart(updatedCart);
        renderCart();
      });
    });
  }

  function renderCart() {
    const cart = getCart();
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalValue = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountValue = getDiscountValue(subtotalValue);
    const discountedSubtotal = Math.max(subtotalValue - discountValue, 0);
    const shippingValue = discountedSubtotal >= FREE_SHIPPING_THRESHOLD || discountedSubtotal === 0 ? 0 : 9.95;
    const taxValue = discountedSubtotal * TAX_RATE;
    const totalValue = discountedSubtotal + shippingValue + taxValue;

    if (cartCount) cartCount.textContent = itemCount;

    if (!cart.length) {
      cartEmptyState.hidden = false;
      cartItemsList.hidden = true;
      cartItemsList.innerHTML = "";
    } else {
      cartEmptyState.hidden = true;
      cartItemsList.hidden = false;

      cartItemsList.innerHTML = cart.map((item, index) => `
        <div class="cart-item-card">
          <div class="cart-item-image-wrap">
            <img src="${item.image}" alt="${item.name}">
          </div>

          <div class="cart-item-content">
            <div class="cart-item-top">
              <div>
                <h3 class="cart-item-name">${item.name}</h3>
                ${item.variant ? `<p class="cart-item-variant">${item.variant}</p>` : ""}
              </div>

              <button class="cart-item-remove" data-remove-index="${index}" aria-label="Remove item">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

            <div class="cart-item-bottom">
              <div class="cart-qty">
                <button type="button" data-decrease-index="${index}">−</button>
                <span>${item.qty}</span>
                <button type="button" data-increase-index="${index}">+</button>
              </div>

              <div class="cart-item-price-wrap">
                ${item.oldPrice ? `<span class="cart-item-old-price">${formatMoney(item.oldPrice * item.qty)}</span>` : ""}
                <span class="cart-item-price">${formatMoney(item.price * item.qty)}</span>
              </div>
            </div>
          </div>
        </div>
      `).join("");

      cartItemsList.querySelectorAll("[data-remove-index]").forEach(button => {
        button.addEventListener("click", () => {
          const updatedCart = getCart();
          updatedCart.splice(Number(button.dataset.removeIndex), 1);
          saveCart(updatedCart);
          renderCart();
        });
      });

      cartItemsList.querySelectorAll("[data-increase-index]").forEach(button => {
        button.addEventListener("click", () => {
          const updatedCart = getCart();
          updatedCart[Number(button.dataset.increaseIndex)].qty += 1;
          saveCart(updatedCart);
          renderCart();
        });
      });

      cartItemsList.querySelectorAll("[data-decrease-index]").forEach(button => {
        button.addEventListener("click", () => {
          const updatedCart = getCart();
          const item = updatedCart[Number(button.dataset.decreaseIndex)];
          item.qty -= 1;

          if (item.qty <= 0) {
            updatedCart.splice(Number(button.dataset.decreaseIndex), 1);
          }

          saveCart(updatedCart);
          renderCart();
        });
      });
    }

    if (cartSubtotal) cartSubtotal.textContent = formatMoney(subtotalValue);
    if (cartShipping) cartShipping.textContent = shippingValue === 0 ? "Free" : formatMoney(shippingValue);
    if (cartTax) cartTax.textContent = formatMoney(taxValue);
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

    renderRecommendations(cart);
  }

  if (applyCartDiscount) {
    applyCartDiscount.addEventListener("click", () => {
      const code = cartDiscountCode.value.trim().toUpperCase();

      if (code === "SAVE10") {
        saveDiscount({ code, type: "percent", amount: 10 });
        cartDiscountMessage.textContent = "10% discount applied.";
      } else if (code === "SAVE20") {
        saveDiscount({ code, type: "fixed", amount: 20 });
        cartDiscountMessage.textContent = "$20 discount applied.";
      } else if (code === "") {
        saveDiscount(null);
        cartDiscountMessage.textContent = "";
      } else {
        saveDiscount(null);
        cartDiscountMessage.textContent = "Invalid code.";
      }

      renderCart();
    });
  }

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (overlay) overlay.addEventListener("click", closeCart);

  window.openCartDrawer = openCart;
  window.closeCartDrawer = closeCart;
  window.renderCartDrawer = renderCart;

  renderCart();
});
