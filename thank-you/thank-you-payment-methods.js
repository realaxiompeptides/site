function thankYouNormalizePaymentMethod(method) {
  const value = String(method || "").trim().toLowerCase();

  if (!value) return "";

  if (value.includes("cash")) return "cashapp";
  if (value.includes("apple")) return "applepay";
  if (value.includes("zelle")) return "zelle";
  if (value.includes("venmo")) return "venmo";
  if (value.includes("crypto")) return "crypto";
  if (value.includes("bitcoin")) return "crypto";
  if (value.includes("ethereum")) return "crypto";
  if (value.includes("usdt")) return "crypto";
  if (value.includes("usdc")) return "crypto";
  if (value.includes("sol")) return "crypto";
  if (value.includes("solana")) return "crypto";

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

function thankYouGetOrderFollowupText(paymentKey, orderNumber) {
  const safeOrder = thankYouEscapeHtml(orderNumber);

  if (paymentKey === "applepay" || paymentKey === "zelle") {
    return `Message your order #<strong>${safeOrder}</strong> after sending payment.`;
  }

  if (paymentKey === "crypto") {
    return `Send your transaction ID and order #<strong>${safeOrder}</strong> using one of the contact options below.`;
  }

  return `Include order #<strong>${safeOrder}</strong> in the note.`;
}

const THANK_YOU_PAYMENT_METHODS = {
  venmo: {
    key: "venmo",
    label: "Venmo",
    logo: "../images/payment-icons/venmo.jpg",
    handleLabel: "Venmo Username",
    handle: "@jax-ferone-839",
    linkLabel: "Venmo Link",
    link: "https://venmo.com/u/jax-ferone-839",
    instructions:
      "Send payment through Venmo and include only your order number in the note."
  },

  zelle: {
    key: "zelle",
    label: "Zelle",
    logo: "../images/payment-icons/zelle.jpg",
    handleLabel: "Zelle Phone",
    handle: "916-233-5312",
    secondaryLabel: "Zelle Email",
    secondaryValue: "jaxferone@gmail.com",
    linkLabel: "",
    link: "",
    instructions:
      "Send payment through Zelle, then message the phone number with your order number so we can match your payment."
  },

  cashapp: {
    key: "cashapp",
    label: "Cash App",
    logo: "../images/payment-icons/cashapp.PNG",
    handleLabel: "Cash App Username",
    handle: "$axiompeptides",
    linkLabel: "Cash App Link",
    link: "https://cash.app/$axiompeptides",
    instructions:
      "Send payment through Cash App and include only your order number in the note."
  },

  applepay: {
    key: "applepay",
    label: "Apple Pay",
    logo: "../images/payment-icons/applepay.jpg",
    handleLabel: "Apple Pay Contact",
    handle: "530-701-9349",
    linkLabel: "",
    link: "",
    instructions:
      "Send payment through Apple Pay, then message the phone number with your order number so we can match your payment."
  },

  crypto: {
    key: "crypto",
    label: "Crypto",
    logo: "../images/payment-icons/crypto-group.jpg",
    instructions:
      "Send the exact amount using the correct crypto and network. After sending, send your transaction ID and order number using one of the contact options below so we can confirm your payment.",
    wallets: [
      {
        label: "Bitcoin (BTC)",
        value: "bc1qexamplebtcaddress1234567890test"
      },
      {
        label: "Ethereum (ETH)",
        value: "0xExampleEthereumAddress1234567890ABCDEF"
      },
      {
        label: "USDT",
        value: "TExampleUSDTWalletAddress123456789ABCDEFG"
      },
      {
        label: "Solana (SOL)",
        value: "So1anaExampleWalletAddress123456789ABCDEFG"
      },
      {
        label: "USDC",
        value: "0xExampleUSDCAddress1234567890ABCDEF"
      }
    ],
    cryptoContacts: [
      {
        label: "Email Us",
        href: "mailto:realaxiompeptides@gmail.com?subject=Crypto%20Payment%20Confirmation",
        external: false
      },
      {
        label: "WhatsApp",
        href: "https://wa.me/15307019349",
        external: true
      },
      {
        label: "Telegram",
        href: "https://t.me/+2hr9SQknvslkZDg5",
        external: true
      },
      {
        label: "Discord",
        href: "https://discord.gg/Wz9C39ERe",
        external: true
      }
    ]
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

function thankYouCreateActionButtons(buttons, orderNumber) {
  if (!Array.isArray(buttons) || !buttons.length) return "";

  const safeOrder = thankYouEscapeHtml(orderNumber ? `#${orderNumber}` : "");

  return `
    <div class="thank-you-payment-contact-section">
      <div class="thank-you-payment-copy-header">
        Send your transaction ID and ${safeOrder ? `order number ${safeOrder}` : "order number"}
      </div>
      <div class="thank-you-payment-action-grid">
        ${buttons
          .map((button) => {
            const safeLabel = thankYouEscapeHtml(button.label || "");
            const safeHref = thankYouEscapeHtml(button.href || "#");
            const rel = button.external ? `target="_blank" rel="noopener noreferrer"` : "";
            return `
              <a
                class="thank-you-payment-action-btn"
                href="${safeHref}"
                ${rel}
              >
                ${safeLabel}
              </a>
            `;
          })
          .join("")}
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

  if (Array.isArray(methodConfig.wallets) && methodConfig.wallets.length) {
    detailsHtml += `
      <div class="thank-you-payment-crypto-grid">
        ${methodConfig.wallets.map((wallet) => {
          return `
            <div class="thank-you-payment-crypto-card">
              ${thankYouCreateCopyButton(wallet.label, wallet.value)}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  if (Array.isArray(methodConfig.cryptoContacts) && methodConfig.cryptoContacts.length) {
    detailsHtml += thankYouCreateActionButtons(methodConfig.cryptoContacts, orderNumber);
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
  const safeLogo = thankYouEscapeHtml(methodConfig.logo || "");

  return `
    <div class="thank-you-payment-method-card is-primary">
      <div class="thank-you-payment-method-top">
        <div class="thank-you-payment-method-heading-row inline-header">
          <div class="thank-you-payment-method-logo-wrap">
            <img
              src="${safeLogo}"
              alt="${safeLabel} logo"
              class="thank-you-payment-method-logo"
              onerror="this.style.display='none';"
            />
          </div>

          <div class="thank-you-payment-method-heading-copy">
            <h3 class="thank-you-payment-method-name">${safeLabel}</h3>
            <p class="thank-you-payment-method-instructions">${safeInstructions}</p>
            ${
              orderNumber
                ? `<p class="thank-you-payment-order-note">${thankYouGetOrderFollowupText(methodConfig.key, orderNumber)}</p>`
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
  const safeLogo = thankYouEscapeHtml(methodConfig.logo || "");
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
          <span class="thank-you-payment-method-logo-wrap">
            <img
              src="${safeLogo}"
              alt="${safeLabel} logo"
              class="thank-you-payment-method-logo"
              onerror="this.style.display='none';"
            />
          </span>

          <span class="thank-you-payment-accordion-title-wrap">
            <span class="thank-you-payment-accordion-title">${safeLabel}</span>
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
          <p class="thank-you-payment-method-instructions">${safeInstructions}</p>
          ${
            orderNumber
              ? `<p class="thank-you-payment-order-note">${thankYouGetOrderFollowupText(methodConfig.key, orderNumber)}</p>`
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
  const items = Array.from(document.querySelectorAll(".thank-you-payment-accordion-item"));

  items.forEach((item) => {
    const toggle = item.querySelector(".thank-you-payment-accordion-toggle");
    const panel = item.querySelector(".thank-you-payment-accordion-panel");

    if (!toggle || !panel) return;
    if (toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";

    toggle.addEventListener("click", function () {
      const willOpen = !item.classList.contains("is-open");

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

      if (willOpen) {
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
      <h2 class="thank-you-payment-section-title">Complete Your Payment</h2>
      ${
        selectedMethod
          ? thankYouBuildPrimaryMethodCard(selectedMethod, orderNumber)
          : `
            <div class="thank-you-payment-method-card is-primary">
              <p class="thank-you-payment-empty-text">
                No payment method was selected for this order.
              </p>
              ${orderNumber ? thankYouCreateCopyButton("Order Number", `#${orderNumber}`) : ""}
            </div>
          `
      }
    </section>

    <section class="thank-you-payment-section-card">
      <h2 class="thank-you-payment-section-title">Other Payment Options</h2>
      <p class="thank-you-payment-section-subtext">
        You can also use any of the payment methods below if you do not want to use the selected one anymore.
        Please include your order number in the note or message it after payment when required.
      </p>

      <div class="thank-you-payment-accordion">
        ${otherMethods.map((method, index) => thankYouBuildAccordionItem(method, orderNumber, index)).join("")}
      </div>
    </section>
  `;

  thankYouBindPaymentCopyButtons();
  thankYouBindPaymentAccordion();
}
