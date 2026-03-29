window.AXIOM_SHIPPING_RATES = (function () {
  const FREE_WORLDWIDE_SHIPPING_THRESHOLD = 250;

  const DOMESTIC_METHODS = [
    {
      id: "usps_ground_advantage",
      label: "USPS Ground Advantage",
      amount: 14.95,
      eta: "2–5 business days"
    },
    {
      id: "usps_priority_mail",
      label: "USPS Priority Mail",
      amount: 34.95,
      eta: "1–3 business days"
    }
  ];

  const INTERNATIONAL_METHODS = [
    {
      id: "intl_standard",
      label: "Standard International",
      amount: 28.99,
      eta: "7–14 business days"
    },
    {
      id: "intl_express",
      label: "Express International",
      amount: 59.95,
      eta: "4–8 business days"
    }
  ];

  function normalizeCountryCode(countryCode) {
    return String(countryCode || "").trim().toUpperCase();
  }

  function normalizePostalCode(postalCode) {
    return String(postalCode || "").trim();
  }

  function toNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function roundMoney(value) {
    return Number(toNumber(value, 0).toFixed(2));
  }

  function cloneMethods(methods) {
    return (Array.isArray(methods) ? methods : []).map(function (method) {
      return {
        ...method,
        amount: roundMoney(method.amount)
      };
    });
  }

  function buildFreeWorldwideMethod(isDomestic) {
    return {
      id: "free_worldwide_shipping",
      label: "Free Worldwide Shipping",
      amount: 0,
      eta: isDomestic ? "3–7 business days" : "7–14 business days",
      is_free_shipping: true
    };
  }

  function getDomesticRates(orderSubtotal) {
    const subtotal = toNumber(orderSubtotal, 0);
    const methods = [];

    if (subtotal >= FREE_WORLDWIDE_SHIPPING_THRESHOLD) {
      methods.push(buildFreeWorldwideMethod(true));
    }

    return methods.concat(cloneMethods(DOMESTIC_METHODS)).map(function (method) {
      return {
        ...method,
        currency: "USD",
        country_group: "domestic"
      };
    });
  }

  function getInternationalRates(orderSubtotal) {
    const subtotal = toNumber(orderSubtotal, 0);
    const methods = [];

    if (subtotal >= FREE_WORLDWIDE_SHIPPING_THRESHOLD) {
      methods.push(buildFreeWorldwideMethod(false));
    }

    return methods.concat(cloneMethods(INTERNATIONAL_METHODS)).map(function (method) {
      return {
        ...method,
        currency: "USD",
        country_group: "international"
      };
    });
  }

  function getRates(options) {
    const opts = options || {};
    const countryCode = normalizeCountryCode(opts.countryCode || opts.country || "US");
    const postalCode = normalizePostalCode(opts.postalCode || opts.zip || "");
    const weightOz = toNumber(opts.weightOz, 0);
    const itemCount = toNumber(opts.itemCount, 0);
    const orderSubtotal = toNumber(
      opts.orderSubtotal ??
      opts.subtotal ??
      opts.cartSubtotal ??
      0,
      0
    );

    const isDomestic = countryCode === "US";
    const methods = isDomestic
      ? getDomesticRates(orderSubtotal)
      : getInternationalRates(orderSubtotal);

    return {
      countryCode: countryCode,
      postalCode: postalCode,
      itemCount: itemCount,
      weightOz: weightOz,
      weightLbs: roundMoney(weightOz / 16),
      orderSubtotal: roundMoney(orderSubtotal),
      isDomestic: isDomestic,
      methods: methods,
      freeShippingThreshold: FREE_WORLDWIDE_SHIPPING_THRESHOLD
    };
  }

  return {
    FREE_WORLDWIDE_SHIPPING_THRESHOLD,
    DOMESTIC_METHODS,
    INTERNATIONAL_METHODS,
    getDomesticRates,
    getInternationalRates,
    getRates
  };
})();
