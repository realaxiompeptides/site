function thankYouNormalizePaymentMethod(method) {
  const value = String(method || "").trim().toLowerCase();

  if (!value) return "";

  if (value.includes("cash")) return "cashapp";
  if (value.includes("apple")) return "applepay";
  if (value.includes("zelle")) return "zelle";
  if (value.includes("venmo")) return "venmo";
  if (value.includes("crypto")) return "crypto";
  if (value.includes("bitcoin")) return "crypto";
  if (value.includes("solana")) return "crypto";
  if (value.includes("ethereum")) return "crypto";
  if (value.includes("usdc")) return "crypto";
  if (value.includes("usdt")) return "crypto";

  return value.replace(/\s+/g, "");
}

function thankYouEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
  Replace these with your real payment details.
*/
const THANK_YOU_PAYMENT_METHODS = {
  venmo: {
    key: "venmo",
    label: "Venmo",
    accentClass: "thank-you-payment-accent-venmo",
    iconClass: "fa-brands fa-vimeo-v",
    handleLabel: "Venmo Username",
    handle: "@jax-ferone-839",
    secondaryLabel: "",
    secondaryValue: "",
    linkLabel: "Venmo Link",
    link: "https://venmo.com/u/jax-ferone-839",
    instructions: "Send payment through Venmo and include only your order number in the note."
  },

  zelle: {
    key: "zelle",
    label: "Zelle",
    accentClass: "thank-you-payment-accent-zelle",
    iconClass: "fa-solid fa-z",
    handleLabel: "Zelle Phone",
    handle: "916-233-5312",
    secondaryLabel: "Zelle Email",
    secondaryValue: "testzelle@axiomtest.com",
    linkLabel: "",
    link: "",
    instructions: "Send payment through Zelle and include only your order number in the note."
  },

  cashapp: {
    key: "cashapp",
    label: "Cash App",
    accentClass: "thank-you-payment-accent-cashapp",
    iconClass: "fa-solid fa-dollar-sign",
    handleLabel: "Cash App Username",
    handle: "$REPLACE_WITH_YOUR_CASHAPP",
    secondaryLabel: "",
    secondaryValue: "",
    linkLabel: "Cash App Link",
    link: "https://cash.app/$REPLACE_WITH_YOUR_CASHAPP",
    instructions: "Send payment through Cash App and include only your order number in the note."
  },

  applepay: {
    key: "applepay",
    label: "Apple Pay",
    accentClass: "thank-you-payment-accent-applepay",
    iconClass: "fa-brands fa-apple",
    handleLabel: "Apple Pay Contact",
    handle: "916-233-5312",
    secondaryLabel: "",
    secondaryValue: "",
    linkLabel: "",
    link: "",
    instructions: "Send payment through Apple Pay and include only your order number in the note if prompted."
  },

  crypto: {
    key: "crypto",
    label: "Crypto",
    accentClass: "thank-you-payment-accent-crypto",
    iconClass: "fa-brands fa-bitcoin",
    handleLabel: "Wallet / Payment Details",
    handle: "Contact for wallet",
    secondaryLabel: "",
    secondaryValue: "",
    linkLabel: "",
    link: "",
    instructions: "Send the exact amount using the correct crypto and network. Include your order number in the memo if available.",
    wallets: {
      bitcoin: "bc1qexamplebtcaddress1234567890test",
      solana: "So1anaExampleWalletAddress123456789ABCDEFG",
      ethereum: "0xExampleEthereumAddress1234567890ABCDEF",
      usdc: "0xExampleUSDCAddress1234567890ABCDEF",
      usdt: "TExampleUSDTWalletAddress123456789ABCDEFG"
    }
  }
};

function thankYouCreateCopyButton(label, value) {
  const safeLabel = thankYouEscapeHtml(label);
  const safeValue = thankYouEscapeHtml(value);

  return `
    <div class="thank-you-payment-copy-block">
      <div class="thank-you-payment-copy-header">${safeLabel}</div>
      <div class="thank-you-payment-copy-row">
        <input
          type="text"
          readonly
          value="${safeValue}"
          class="thank-you-payment-copy-input"
        />
        <button
          type="button"
          class="thank-you-payment-copy-btn"
          data-copy="${safeValue}"
        >
          Copy
        </button>
      </div>
    </div>
  `;
}

function thankYouCreateLinkBlock(label, url) {
  const safeLabel = thankYouEscapeHtml(label);
  const safeUrl = thankYouEscapeHtml(url);

  return `
    <div class="thank-you-payment-copy-block">
      <div class="thank-you-payment-copy-header">${safeLabel}</div>
      <div class="thank-you-payment-link-row">
        <a
          href="${safeUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="thank-you-payment-open-link"
        >
          ${safeUrl}
        </a>
        <button
          type="button"
          class="thank-you-payment-copy-btn"
          data-copy="${safeUrl}"
        >
          Copy Link
        </button>
      </div>
    </div>
  `;
}

function thankYouBuildMethodDetails(methodConfig, orderNumber) {
  if (!methodConfig) return "";

  let detailsHtml = "";

  if (methodConfig.link) {
    detailsHtml += thankYouCreateLinkBlock(
      methodConfig.linkLabel || "Payment Link",
      methodConfig.link
    );
  }

  if (methodConfig.handle) {
    detailsHtml += thankYouCreateCopyButton(
      methodConfig.handleLabel || "Payment Info",
      methodConfig.handle
    );
  }

  if (methodConfig.secondaryValue) {
    detailsHtml += thankYouCreateCopyButton(
      methodConfig.secondaryLabel || "Additional Info",
      methodConfig.secondaryValue
    );
  }

  if (methodConfig.wallets) {
    if (methodConfig.wallets.bitcoin) {
      detailsHtml += thankYouCreateCopyButton("Bitcoin (BTC)", methodConfig.wallets.bitcoin);
    }
    if (methodConfig.wallets.solana) {
      detailsHtml += thankYouCreateCopyButton("Solana (SOL)", methodConfig.wallets.solana);
    }
    if (methodConfig.wallets.ethereum) {
      detailsHtml += thankYouCreateCopyButton("Ethereum (ETH)", methodConfig.wallets.ethereum);
    }
    if (methodConfig.wallets.usdc) {
      detailsHtml += thankYouCreateCopyButton("USDC", methodConfig.wallets.usdc);
    }
    if (methodConfig.wallets.usdt) {
      detailsHtml += thankYouCreateCopyButton("USDT", methodConfig.wallets.usdt);
    }
  }

  if (orderNumber) {
    detailsHtml += thankYouCreateCopyButton("Order Number", `#${orderNumber}`);
  }

  return detailsHtml;
}

function thankYouBuildPrimaryMethodCard(methodConfig, orderNumber) {
  if (!methodConfig) return "";

  const safeLabel = thankYouEscapeHtml(methodConfig.label);
  const safeInstructions = thankYouEscapeHtml(methodConfig.instructions || "");
  const safeAccentClass = thankYouEscapeHtml(methodConfig.accentClass || "");
  const safeIconClass = thankYouEscapeHtml(methodConfig.iconClass || "fa-solid fa-credit-card");

  return `
    <div class="thank-you-payment-method-card is-primary">
      <div class="thank-you-payment-method-top">
        <div class="thank-you-payment-method-heading-row">
          <div class="thank-you-payment-method-icon-badge ${safeAccentClass}">
            <i class="${safeIconClass}"></i>
          </div>

          <div class="thank-you-payment-method-heading-copy">
            <h3 class="thank-you-payment-method-name ${safeAccentClass}">
              ${safeLabel}
            </h3>
            <p class="thank-you-payment-method-instructions">
              ${safeInstructions}
            </p>
            ${
              orderNumber
                ? `<p class="thank-you-payment-order-note">Include order #<strong>${thankYouEscapeHtml(orderNumber)}</strong> in the note.</p>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="thank-you-payment-method-details">
        ${thankYouBuildMethodDetails(methodConfig, orderNumber)}
      </div>
    </div>
  `;
}

function thankYouBuildAccordionItem(methodConfig, orderNumber, index) {
  if (!methodConfig) return "";

  const safeLabel = thankYouEscapeHtml(methodConfig.label);
  const safeInstructions = thankYouEscapeHtml(methodConfig.instructions || "");
  const safeAccentClass = thankYouEscapeHtml(methodConfig.accentClass || "");
  const safeIconClass = thankYouEscapeHtml(methodConfig.iconClass || "fa-solid fa-credit-card");
  const panelId = `thankYouPaymentAccordionPanel${index}`;

  return `
    <div class="thank-you-payment-accordion-item" data-payment-key="${thankYouEscapeHtml(methodConfig.key)}">
      <button
        type="button"
        class="thank-you-payment-accordion-toggle"
        aria-expanded="false"
        aria-controls="${panelId}"
      >
        <span class="thank-you-payment-accordion-left">
          <span class="thank-you-payment-method-icon-badge ${safeAccentClass}">
            <i class="${safeIconClass}"></i>
          </span>

          <span class="thank-you-payment-accordion-title-wrap">
            <span class="thank-you-payment-accordion-title ${safeAccentClass}">${safeLabel}</span>
            <span class="thank-you-payment-accordion-subtitle">Tap to view payment details</span>
          </span>
        </span>

        <span class="thank-you-payment-accordion-chevron" aria-hidden="true">
          <i class="fa-solid fa-chevron-down"></i>
        </span>
      </button>

      <div
        id="${panelId}"
        class="thank-you-payment-accordion-panel"
        hidden
      >
        <div class="thank-you-payment-accordion-panel-inner">
          <p class="thank-you-payment-method-instructions">
            ${safeInstructions}
          </p>

          ${
            orderNumber
              ? `<p class="thank-you-payment-order-note">Include order #<strong>${thankYouEscapeHtml(orderNumber)}</strong> in the note.</p>`
              : ""
          }

          <div class="thank-you-payment-method-details">
            ${thankYouBuildMethodDetails(methodConfig, orderNumber)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function thankYouBindPaymentCopyButtons() {
  const buttons = document.querySelectorAll(".thank-you-payment-copy-btn");

  buttons.forEach(function (button) {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", async function () {
      const value = this.getAttribute("data-copy") || "";
      const originalText = this.textContent;

      try {
        await navigator.clipboard.writeText(value);
        this.textContent = "Copied";
      } catch (error) {
        console.error("Copy failed:", error);

        const row = this.closest(".thank-you-payment-copy-row, .thank-you-payment-link-row");
        const input = row ? row.querySelector("input") : null;

        if (input) {
          input.focus();
          input.select();

          try {
            document.execCommand("copy");
            this.textContent = "Copied";
          } catch (fallbackError) {
            console.error("Fallback copy failed:", fallbackError);
            this.textContent = "Copy Failed";
          }
        } else {
          this.textContent = "Copy Failed";
        }
      }

      setTimeout(() => {
        this.textContent = originalText;
      }, 1200);
    });
  });
}

function thankYouBindPaymentAccordion() {
  const items = document.querySelectorAll(".thank-you-payment-accordion-item");

  items.forEach((item) => {
    const toggle = item.querySelector(".thank-you-payment-accordion-toggle");
    const panel = item.querySelector(".thank-you-payment-accordion-panel");

    if (!toggle || !panel) return;
    if (toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";

    toggle.addEventListener("click", function () {
      const isOpen = item.classList.contains("is-open");

      items.forEach((otherItem) => {
        otherItem.classList.remove("is-open");

        const otherToggle = otherItem.querySelector(".thank-you-payment-accordion-toggle");
        const otherPanel = otherItem.querySelector(".thank-you-payment-accordion-panel");

        if (otherToggle) {
          otherToggle.setAttribute("aria-expanded", "false");
        }

        if (otherPanel) {
          otherPanel.hidden = true;
        }
      });

      if (!isOpen) {
        item.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        panel.hidden = false;
      }
    });
  });
}

function renderThankYouPaymentMethods(order) {
  const mount =
    document.getElementById("paymentMethodsSection") ||
    document.getElementById("thankYouPaymentInstructions") ||
    document.getElementById("paymentInstructions") ||
    document.getElementById("thankYouPaymentDetails") ||
    document.getElementById("thankYouPayNowBox");

  if (!mount) return;

  const paymentKey = thankYouNormalizePaymentMethod(order?.payment_method || "");
  const selectedMethod = THANK_YOU_PAYMENT_METHODS[paymentKey] || null;
  const orderNumber = order?.order_number ? String(order.order_number) : "";

  const otherMethods = Object.values(THANK_YOU_PAYMENT_METHODS).filter((method) => {
    return method.key !== paymentKey;
  });

  mount.innerHTML = `
    <section class="thank-you-payment-section-card">
      <h2 class="thank-you-payment-section-title">Your Payment Method</h2>
      ${
        selectedMethod
          ? thankYouBuildPrimaryMethodCard(selectedMethod, orderNumber)
          : `
            <div class="thank-you-payment-method-card is-primary">
              <p class="thank-you-payment-empty-text">
                No payment method was selected for this order.
              </p>
              ${
                orderNumber
                  ? thankYouCreateCopyButton("Order Number", `#${orderNumber}`)
                  : ""
              }
            </div>
          `
      }
    </section>

    <section class="thank-you-payment-section-card">
      <h2 class="thank-you-payment-section-title">Other Payment Methods</h2>
      <p class="thank-you-payment-section-subtext">
        You can also use any of the payment methods below if you do not want to use the selected one anymore.
        Please include your order number in the note.
      </p>

      <div class="thank-you-payment-accordion">
        ${otherMethods.map((method, index) => thankYouBuildAccordionItem(method, orderNumber, index)).join("")}
      </div>
    </section>
  `;

  thankYouBindPaymentCopyButtons();
  thankYouBindPaymentAccordion();
}
