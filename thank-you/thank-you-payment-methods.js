function thankYouNormalizePaymentMethod(method) {
  const value = String(method || "").trim().toLowerCase();

  if (!value) return "";

  if (value.includes("bank")) return "banktransfer";
  if (value.includes("wire")) return "banktransfer";
  if (value.includes("transfer")) return "banktransfer";
  if (value.includes("apple")) return "applepay";
  if (value.includes("zelle")) return "zelle";
  if (value.includes("venmo")) return "venmo";
  if (value.includes("cashapp")) return "cashapp";
  if (value.includes("cash app")) return "cashapp";
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

function thankYouGetFirstNonEmptyValue(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function thankYouNormalizeCountryValue(country) {
  return String(country || "").trim().toUpperCase();
}

function thankYouGetOrderCountry(order) {
  const directCountry = thankYouGetFirstNonEmptyValue([
    order?.shipping_country,
    order?.shippingCountry,
    order?.country,
    order?.billing_country,
    order?.billingCountry,
    order?.customer_country,
    order?.customerCountry,
    order?.shipping_country_code,
    order?.shippingCountryCode,
    order?.billing_country_code,
    order?.billingCountryCode
  ]);

  if (directCountry) {
    return thankYouNormalizeCountryValue(directCountry);
  }

  const nestedCountry = thankYouGetFirstNonEmptyValue([
    order?.shipping?.country,
    order?.shipping?.countryCode,
    order?.shipping?.country_code,
    order?.shipping_address?.country,
    order?.shipping_address?.countryCode,
    order?.shipping_address?.country_code,
    order?.shippingAddress?.country,
    order?.shippingAddress?.countryCode,
    order?.shippingAddress?.country_code,
    order?.billing?.country,
    order?.billing?.countryCode,
    order?.billing?.country_code,
    order?.billing_address?.country,
    order?.billing_address?.countryCode,
    order?.billing_address?.country_code,
    order?.billingAddress?.country,
    order?.billingAddress?.countryCode,
    order?.billingAddress?.country_code,
    order?.customer?.country,
    order?.customer?.countryCode,
    order?.customer?.country_code
  ]);

  return thankYouNormalizeCountryValue(nestedCountry);
}

function thankYouIsInternationalOrder(order) {
  const country = thankYouGetOrderCountry(order);

  if (!country) return false;

  return !["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(country);
}

function thankYouGetOrderFollowupText(paymentKey, orderNumber, order) {
  const safeOrder = thankYouEscapeHtml(orderNumber);

  if (paymentKey === "applepay" || paymentKey === "zelle") {
    return `Message your order #<strong>${safeOrder}</strong> after sending payment.`;
  }

  if (paymentKey === "crypto") {
    return `After sending crypto, message your transaction ID and order #<strong>${safeOrder}</strong> using WhatsApp or Telegram below so we can confirm your payment.`;
  }

  if (paymentKey === "cashapp") {
    return `You can either send payment to the Cash App username below or use Cash App Bitcoin and send to the BTC address below. Include order #<strong>${safeOrder}</strong> so we can match your payment correctly.`;
  }

  if (paymentKey === "banktransfer") {
    if (thankYouIsInternationalOrder(order)) {
      return `Use order #<strong>${safeOrder}</strong> as the payment reference when possible, then message us after sending the international wire so we can match it to your order.`;
    }

    return `Use order #<strong>${safeOrder}</strong> as the payment reference when possible, then message us after sending the domestic transfer so we can match it to your order.`;
  }

  return `Include order #<strong>${safeOrder}</strong> in the note.`;
}

const THANK_YOU_PAYMENT_METHODS = {
  venmo: {
    key: "venmo",
    label: "Venmo",
    logo: "../images/payment-icons/venmo.jpg",
    handleLabel: "Venmo Username",
    handle: "@thomas-harris-axiom",
    linkLabel: "Venmo Link",
    link: "https://venmo.com/code?user_id=4564578725790758651&created=1774909047.164281&printed=1",
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
    handleLabel: "Cash App Tag",
    handle: "$axiompeptides",
    linkLabel: "",
    link: "",
    instructionHtml: `
      <div class="thank-you-payment-steps-card">
        <div class="thank-you-payment-steps-title">How to Pay with Cash App</div>
        <ol class="thank-you-payment-steps-list">
          <li>Option 1: send payment directly to our Cash App username <strong>$axiompeptides</strong>.</li>
          <li>Option 2: open Cash App Bitcoin and send BTC to our Bitcoin address shown below.</li>
          <li>If paying by Cash App username, send the exact order total and include <strong>only your order number</strong> in the note.</li>
          <li>If paying with Cash App Bitcoin, send BTC to the address below, then keep your transaction confirmation.</li>
          <li>After sending either way, message us on WhatsApp or Telegram with your order number so we can confirm your payment faster.</li>
        </ol>
      </div>
    `,
    instructions:
      "You can pay using our Cash App username or send Bitcoin through Cash App to the BTC address below.",
    extraCopyFields: [
      {
        label: "Bitcoin (BTC) Address",
        value: "bc1q7hruzv3vy3hhdkceaa5hmlgjcqnky78wwjs4t8"
      }
    ],
    actionButtons: [
      {
        label: "WhatsApp",
        href: "https://wa.me/15307019349",
        external: true
      },
      {
        label: "Telegram",
        href: "https://t.me/axiompeptides",
        external: true
      }
    ]
  },

  banktransfer: {
    key: "banktransfer",
    label: "Bank Transfer",
    logo: "",
    iconClass: "fa-solid fa-building-columns",
    domesticInstructions:
      "Send payment by domestic bank transfer using the exact details below. Use your order number as the payment reference when possible, then message us after sending so we can match your payment.",
    internationalInstructions:
      "Send payment by international wire using the exact details below. Use your order number as the payment reference when possible, then message us after sending so we can match your payment.",

    domesticDetails: [
      {
        label: "Bank Name",
        value: "Mercury"
      },
      {
        label: "Receiving Bank",
        value: "Column N.A."
      },
      {
        label: "Routing Number",
        value: "121145433"
      },
      {
        label: "Account Number",
        value: "621956274808088"
      },
      {
        label: "Account Type",
        value: "Checking"
      },
      {
        label: "Bank Address",
        value: "1 Letterman Drive, Building A, Suite A4-700, San Francisco, CA 94129 USA"
      },
      {
        label: "Beneficiary Name",
        value: "Axiom Peptides LLC"
      },
      {
        label: "Beneficiary Address",
        value: "30 North Gould Street, Sheridan, WY 82801 USA"
      },
      {
        label: "Reference",
        value: "Use your order number as the payment reference"
      }
    ],

    internationalDetails: [
      {
        label: "Bank Name",
        value: "Mercury"
      },
      {
        label: "Receiving Bank",
        value: "Column N.A."
      },
      {
        label: "SWIFT / BIC",
        value: "CLNOUS66MER"
      },
      {
        label: "ABA Routing Number",
        value: "121145433"
      },
      {
        label: "ABA Routing Number (Alternate)",
        value: "121145307"
      },
      {
        label: "Intermediary Bank SWIFT / BIC",
        value: "CHASUS33XXX"
      },
      {
        label: "Beneficiary Name",
        value: "Axiom Peptides LLC"
      },
      {
        label: "IBAN / Account Number",
        value: "621956274808088"
      },
      {
        label: "Beneficiary Address",
        value: "30 North Gould Street, Sheridan, WY 82801 USA"
      },
      {
        label: "Bank Address",
        value: "1 Letterman Drive, Building A, Suite A4-700, San Francisco, CA 94129 USA"
      },
      {
        label: "Reference",
        value: "Use your order number as the payment reference"
      }
    ],

    bankContacts: [
      {
        label: "Email Us",
        href: "mailto:realaxiompeptides@gmail.com?subject=Bank%20Transfer%20Confirmation",
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
  },

  applepay: {
    key: "applepay",
    label: "Apple Pay",
    logo: "../images/payment-icons/applepay.jpg",
    handleLabel: "Apple Pay Contact",
    handle: "916-233-5312",
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
      "Send the exact amount using the correct crypto and network. After sending, message your transaction ID and order number using WhatsApp or Telegram below so we can confirm your payment.",
    wallets: [
      {
        label: "Bitcoin (BTC)",
        value: "bc1q7hruzv3vy3hhdkceaa5hmlgjcqnky78wwjs4t8"
      },
      {
        label: "Ethereum (ETH)",
        value: "0x57E23546A3EB31629a91dA386d4BD2F66E1Af437"
      },
      {
        label: "USDT (ERC-20 / ETH)",
        value: "0x57E23546A3EB31629a91dA386d4BD2F66E1Af437"
      },
      {
        label: "USDC (ERC-20 / ETH)",
        value: "0x57E23546A3EB31629a91dA386d4BD2F66E1Af437"
      },
      {
        label: "Solana (SOL)",
        value: "Fmycu2E56gAqMDDNCJJUY2iZEsQsQBUeB3B9Vf9W3QhC"
      },
      {
        label: "USDC (Solana)",
        value: "Fmycu2E56gAqMDDNCJJUY2iZEsQsQBUeB3B9Vf9W3QhC"
      },
      {
        label: "USDT (Solana)",
        value: "Fmycu2E56gAqMDDNCJJUY2iZEsQsQBUeB3B9Vf9W3QhC"
      }
    ],
    cryptoContacts: [
      {
        label: "WhatsApp",
        href: "https://wa.me/15307019349",
        external: true
      },
      {
        label: "Telegram",
        href: "https://t.me/axiompeptides",
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

function thankYouCreateActionButtons(buttons, orderNumber, headingText) {
  if (!Array.isArray(buttons) || !buttons.length) return "";

  const safeOrder = thankYouEscapeHtml(orderNumber ? `#${orderNumber}` : "");
  const title = headingText
    ? headingText
    : `Send your transaction ID and ${safeOrder ? `order number ${safeOrder}` : "order number"}`;

  return `
    <div class="thank-you-payment-contact-section">
      <div class="thank-you-payment-copy-header">
        ${title}
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

function thankYouGetBankTransferDetails(methodConfig, order) {
  if (!methodConfig || methodConfig.key !== "banktransfer") return [];

  return thankYouIsInternationalOrder(order)
    ? methodConfig.internationalDetails || []
    : methodConfig.domesticDetails || [];
}

function thankYouGetBankTransferInstructions(methodConfig, order) {
  if (!methodConfig || methodConfig.key !== "banktransfer") {
    return methodConfig?.instructions || "";
  }

  return thankYouIsInternationalOrder(order)
    ? methodConfig.internationalInstructions || ""
    : methodConfig.domesticInstructions || "";
}

function thankYouRenderMethodInstructions(methodConfig, order) {
  if (!methodConfig) return "";

  if (methodConfig.key === "banktransfer") {
    return `<p class="thank-you-payment-method-instructions">${thankYouEscapeHtml(
      thankYouGetBankTransferInstructions(methodConfig, order) || ""
    )}</p>`;
  }

  if (methodConfig.instructionHtml) {
    return methodConfig.instructionHtml;
  }

  return `<p class="thank-you-payment-method-instructions">${thankYouEscapeHtml(
    methodConfig.instructions || ""
  )}</p>`;
}

function thankYouBuildMethodDetails(methodConfig, orderNumber, order) {
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

  if (Array.isArray(methodConfig.extraCopyFields) && methodConfig.extraCopyFields.length) {
    detailsHtml += methodConfig.extraCopyFields
      .map((item) => thankYouCreateCopyButton(item.label, item.value))
      .join("");
  }

  const bankDetails = thankYouGetBankTransferDetails(methodConfig, order);

  if (Array.isArray(bankDetails) && bankDetails.length) {
    detailsHtml += `
      <div class="thank-you-payment-bank-grid">
        ${bankDetails
          .map((item) => {
            return thankYouCreateCopyButton(item.label, item.value);
          })
          .join("")}
      </div>
    `;
  }

  if (Array.isArray(methodConfig.wallets) && methodConfig.wallets.length) {
    detailsHtml += `
      <div class="thank-you-payment-crypto-grid">
        ${methodConfig.wallets
          .map((wallet) => {
            return `
              <div class="thank-you-payment-crypto-card">
                ${thankYouCreateCopyButton(wallet.label, wallet.value)}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  if (Array.isArray(methodConfig.cryptoContacts) && methodConfig.cryptoContacts.length) {
    detailsHtml += thankYouCreateActionButtons(
      methodConfig.cryptoContacts,
      orderNumber,
      `After sending crypto, message your transaction ID and order number ${
        orderNumber ? `#${thankYouEscapeHtml(orderNumber)}` : ""
      } using WhatsApp or Telegram.`
    );
  }

  if (Array.isArray(methodConfig.bankContacts) && methodConfig.bankContacts.length) {
    detailsHtml += thankYouCreateActionButtons(
      methodConfig.bankContacts,
      orderNumber,
      `After sending the ${
        thankYouIsInternationalOrder(order) ? "international wire" : "domestic transfer"
      }, message your order number ${
        orderNumber ? `#${thankYouEscapeHtml(orderNumber)}` : ""
      } and payment confirmation.`
    );
  }

  if (Array.isArray(methodConfig.actionButtons) && methodConfig.actionButtons.length) {
    detailsHtml += thankYouCreateActionButtons(
      methodConfig.actionButtons,
      orderNumber,
      `After sending payment, message your order number ${
        orderNumber ? `#${thankYouEscapeHtml(orderNumber)}` : ""
      } and payment confirmation.`
    );
  }

  if (orderNumber) {
    detailsHtml += thankYouCreateCopyButton("Order Number", `#${orderNumber}`);
  }

  return detailsHtml;
}

function thankYouBuildPaymentLogo(methodConfig) {
  const safeLabel = thankYouEscapeHtml(methodConfig.label);
  const safeLogo = thankYouEscapeHtml(methodConfig.logo || "");
  const safeIconClass = thankYouEscapeHtml(methodConfig.iconClass || "fa-solid fa-money-check-dollar");

  if (methodConfig.logo) {
    return `
      <div class="thank-you-payment-method-logo-wrap">
        <img
          src="${safeLogo}"
          alt="${safeLabel} logo"
          class="thank-you-payment-method-logo"
          onerror="this.style.display='none';"
        />
      </div>
    `;
  }

  return `
    <div class="thank-you-payment-method-logo-wrap is-icon-only">
      <span class="thank-you-payment-method-fallback-icon">
        <i class="${safeIconClass}"></i>
      </span>
    </div>
  `;
}

function thankYouBuildPrimaryMethodCard(methodConfig, orderNumber, order) {
  if (!methodConfig) return "";

  const safeLabel = thankYouEscapeHtml(methodConfig.label);

  return `
    <div class="thank-you-payment-method-card is-primary">
      <div class="thank-you-payment-method-top">
        <div class="thank-you-payment-method-heading-row inline-header">
          ${thankYouBuildPaymentLogo(methodConfig)}

          <div class="thank-you-payment-method-heading-copy">
            <h3 class="thank-you-payment-method-name">${safeLabel}</h3>
            ${thankYouRenderMethodInstructions(methodConfig, order)}
            ${
              orderNumber
                ? `<p class="thank-you-payment-order-note">${thankYouGetOrderFollowupText(methodConfig.key, orderNumber, order)}</p>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="thank-you-payment-method-details">
        ${thankYouBuildMethodDetails(methodConfig, orderNumber, order)}
      </div>
    </div>
  `;
}

function thankYouBuildAccordionItem(methodConfig, orderNumber, index, order) {
  if (!methodConfig) return "";

  const safeLabel = thankYouEscapeHtml(methodConfig.label);
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
          ${thankYouBuildPaymentLogo(methodConfig)}

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
          ${thankYouRenderMethodInstructions(methodConfig, order)}
          ${
            orderNumber
              ? `<p class="thank-you-payment-order-note">${thankYouGetOrderFollowupText(methodConfig.key, orderNumber, order)}</p>`
              : ""
          }

          <div class="thank-you-payment-method-details">
            ${thankYouBuildMethodDetails(methodConfig, orderNumber, order)}
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
          ? thankYouBuildPrimaryMethodCard(selectedMethod, orderNumber, order)
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
        ${otherMethods.map((method, index) => thankYouBuildAccordionItem(method, orderNumber, index, order)).join("")}
      </div>
    </section>
  `;

  thankYouBindPaymentCopyButtons();
  thankYouBindPaymentAccordion();
}
