window.AXIOM_SHIPPING_RATES = (function () {
  const COUNTRY_GROUPS = {
    domestic: ["US"],
    canada: ["CA"],
    uk: ["GB"],
    europe: [
      "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
      "GR", "HR", "HU", "IE", "IS", "IT", "LT", "LU", "LV", "MT", "NL", "NO",
      "PL", "PT", "RO", "SE", "SI", "SK"
    ],
    oceania: ["AU", "NZ"],
    asia: [
      "AE", "HK", "ID", "IL", "IN", "JP", "KR", "MY", "PH", "SA", "SG", "TH",
      "TR", "TW", "VN"
    ],
    latin_america: [
      "AR", "BR", "CL", "CO", "CR", "DO", "JM", "MX", "PA", "PE", "PR", "UY"
    ],
    rest_of_world: ["ZA", "EG"]
  };

  const DOMESTIC_RATES = [
    {
      maxWeightOz: 4,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 5.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 9.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 8,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 6.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 10.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 12,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 7.45, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 11.45, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 16,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 7.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 11.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 32,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 9.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 13.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 48,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 11.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 15.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 80,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 14.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 19.95, eta: "1–3 business days" }
      ]
    }
  ];

  const INTERNATIONAL_RATES = {
    canada: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 16.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 31.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 21.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 36.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 27.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 45.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 35.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 57.95, eta: "6–10 business days" }
        ]
      }
    ],

    uk: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 20.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 34.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 26.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 41.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 33.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 52.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 42.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 63.95, eta: "6–10 business days" }
        ]
      }
    ],

    europe: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 20.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 35.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 26.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 42.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 34.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 53.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 43.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 65.95, eta: "6–10 business days" }
        ]
      }
    ],

    oceania: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 21.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 36.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 28.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 44.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 37.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 56.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 47.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 69.95, eta: "6–12 business days" }
        ]
      }
    ],

    asia: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 21.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 35.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 28.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 43.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 37.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 55.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 48.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 68.95, eta: "6–12 business days" }
        ]
      }
    ],

    latin_america: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 20.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 35.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 27.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 43.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 35.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 54.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 45.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 67.95, eta: "6–12 business days" }
        ]
      }
    ],

    rest_of_world: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 23.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 38.95, eta: "6–14 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 30.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 46.95, eta: "6–14 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 39.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 58.95, eta: "6–14 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 50.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 72.95, eta: "6–14 business days" }
        ]
      }
    ]
  };

  const DOMESTIC_BASE_HANDLING_FEE = 0.75;
  const INTERNATIONAL_BASE_HANDLING_FEE = 1.50;
  const DOMESTIC_EXTRA_ITEM_FEE = 0.35;
  const INTERNATIONAL_EXTRA_ITEM_FEE = 0.75;

  const DOMESTIC_OVERFLOW_STEP_OZ = 16;
  const DOMESTIC_OVERFLOW_GROUND_FEE = 2.50;
  const DOMESTIC_OVERFLOW_PRIORITY_FEE = 3.50;

  const INTERNATIONAL_OVERFLOW_STEP_OZ = 16;
  const INTERNATIONAL_OVERFLOW_STANDARD_FEE = 6.00;
  const INTERNATIONAL_OVERFLOW_PRIORITY_FEE = 8.00;

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

  function getCountryGroup(countryCode) {
    const normalized = normalizeCountryCode(countryCode);

    if (!normalized) return "domestic";
    if (COUNTRY_GROUPS.domestic.includes(normalized)) return "domestic";
    if (COUNTRY_GROUPS.canada.includes(normalized)) return "canada";
    if (COUNTRY_GROUPS.uk.includes(normalized)) return "uk";
    if (COUNTRY_GROUPS.europe.includes(normalized)) return "europe";
    if (COUNTRY_GROUPS.oceania.includes(normalized)) return "oceania";
    if (COUNTRY_GROUPS.asia.includes(normalized)) return "asia";
    if (COUNTRY_GROUPS.latin_america.includes(normalized)) return "latin_america";
    return "rest_of_world";
  }

  function getDomesticZoneSurcharge(postalCode) {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) return 0;

    if (/^(967|968|969)/.test(normalized)) {
      return 4.00;
    }

    if (/^(995|996|997|998|999)/.test(normalized)) {
      return 5.00;
    }

    if (/^(006|007|009)/.test(normalized)) {
      return 3.00;
    }

    return 0;
  }

  function getItemCountSurcharge(itemCount, isDomestic) {
    const normalizedCount = Math.max(toNumber(itemCount, 0), 0);
    if (normalizedCount <= 1) return 0;

    const extraItems = normalizedCount - 1;
    const perItemFee = isDomestic ? DOMESTIC_EXTRA_ITEM_FEE : INTERNATIONAL_EXTRA_ITEM_FEE;
    return extraItems * perItemFee;
  }

  function getWeightSurcharge(weightOz, isDomestic) {
    const normalizedWeight = Math.max(toNumber(weightOz, 0), 0);

    if (isDomestic) {
      if (normalizedWeight > 64) return 2.50;
      if (normalizedWeight > 32) return 1.50;
      if (normalizedWeight > 16) return 0.75;
      return 0;
    }

    if (normalizedWeight > 64) return 5.00;
    if (normalizedWeight > 48) return 3.50;
    if (normalizedWeight > 32) return 2.00;
    if (normalizedWeight > 16) return 1.00;
    return 0;
  }

  function getOverflowSteps(weightOz, maxWeightOz, stepOz) {
    const normalizedWeight = Math.max(toNumber(weightOz, 0), 0);
    const maxWeight = Math.max(toNumber(maxWeightOz, 0), 0);
    const step = Math.max(toNumber(stepOz, 0), 1);

    if (normalizedWeight <= maxWeight) return 0;
    return Math.ceil((normalizedWeight - maxWeight) / step);
  }

  function getDomesticOverflowFee(methodId, overflowSteps) {
    const steps = Math.max(toNumber(overflowSteps, 0), 0);
    if (!steps) return 0;

    if (methodId === "usps_priority_mail") {
      return steps * DOMESTIC_OVERFLOW_PRIORITY_FEE;
    }

    return steps * DOMESTIC_OVERFLOW_GROUND_FEE;
  }

  function getInternationalOverflowFee(methodId, overflowSteps) {
    const steps = Math.max(toNumber(overflowSteps, 0), 0);
    if (!steps) return 0;

    if (methodId === "usps_priority_mail_international") {
      return steps * INTERNATIONAL_OVERFLOW_PRIORITY_FEE;
    }

    return steps * INTERNATIONAL_OVERFLOW_STANDARD_FEE;
  }

  function cloneMethods(methods) {
    return (Array.isArray(methods) ? methods : []).map(function (method) {
      return {
        ...method,
        amount: toNumber(method.amount, 0)
      };
    });
  }

  function getDomesticRates(weightOz, postalCode, itemCount) {
    const normalizedWeightOz = Math.max(toNumber(weightOz, 0), 0.01);
    const matchedTier =
      DOMESTIC_RATES.find(function (tier) {
        return normalizedWeightOz <= tier.maxWeightOz;
      }) || DOMESTIC_RATES[DOMESTIC_RATES.length - 1];

    const zoneSurcharge = getDomesticZoneSurcharge(postalCode);
    const itemCountSurcharge = getItemCountSurcharge(itemCount, true);
    const weightSurcharge = getWeightSurcharge(normalizedWeightOz, true);
    const handlingFee = DOMESTIC_BASE_HANDLING_FEE;
    const overflowSteps = getOverflowSteps(
      normalizedWeightOz,
      matchedTier.maxWeightOz,
      DOMESTIC_OVERFLOW_STEP_OZ
    );

    return cloneMethods(matchedTier.methods).map(function (method) {
      const overflowFee = getDomesticOverflowFee(method.id, overflowSteps);

      return {
        ...method,
        amount: roundMoney(
          method.amount +
          zoneSurcharge +
          itemCountSurcharge +
          weightSurcharge +
          handlingFee +
          overflowFee
        ),
        currency: "USD",
        country_group: "domestic",
        overflow_steps: overflowSteps
      };
    });
  }

  function getInternationalRates(weightOz, countryCode, itemCount) {
    const group = getCountryGroup(countryCode);
    const rateTable = INTERNATIONAL_RATES[group] || INTERNATIONAL_RATES.rest_of_world;
    const normalizedWeightOz = Math.max(toNumber(weightOz, 0), 0.01);

    const matchedTier =
      rateTable.find(function (tier) {
        return normalizedWeightOz <= tier.maxWeightOz;
      }) || rateTable[rateTable.length - 1];

    const itemCountSurcharge = getItemCountSurcharge(itemCount, false);
    const weightSurcharge = getWeightSurcharge(normalizedWeightOz, false);
    const handlingFee = INTERNATIONAL_BASE_HANDLING_FEE;
    const overflowSteps = getOverflowSteps(
      normalizedWeightOz,
      matchedTier.maxWeightOz,
      INTERNATIONAL_OVERFLOW_STEP_OZ
    );

    return cloneMethods(matchedTier.methods).map(function (method) {
      const overflowFee = getInternationalOverflowFee(method.id, overflowSteps);

      return {
        ...method,
        amount: roundMoney(
          method.amount +
          itemCountSurcharge +
          weightSurcharge +
          handlingFee +
          overflowFee
        ),
        currency: "USD",
        country_group: group,
        overflow_steps: overflowSteps
      };
    });
  }

  function getRates(options) {
    const opts = options || {};
    const countryCode = normalizeCountryCode(opts.countryCode || opts.country || "US");
    const postalCode = normalizePostalCode(opts.postalCode || opts.zip || "");
    const weightOz = toNumber(opts.weightOz, 0);
    const itemCount = toNumber(opts.itemCount, 0);

    const isDomestic = countryCode === "US";
    const methods = isDomestic
      ? getDomesticRates(weightOz, postalCode, itemCount)
      : getInternationalRates(weightOz, countryCode, itemCount);

    return {
      countryCode: countryCode,
      postalCode: postalCode,
      itemCount: itemCount,
      weightOz: weightOz,
      weightLbs: roundMoney(weightOz / 16),
      isDomestic: isDomestic,
      methods: methods
    };
  }

  return {
    COUNTRY_GROUPS,
    DOMESTIC_RATES,
    INTERNATIONAL_RATES,
    DOMESTIC_BASE_HANDLING_FEE,
    INTERNATIONAL_BASE_HANDLING_FEE,
    DOMESTIC_EXTRA_ITEM_FEE,
    INTERNATIONAL_EXTRA_ITEM_FEE,
    DOMESTIC_OVERFLOW_STEP_OZ,
    DOMESTIC_OVERFLOW_GROUND_FEE,
    DOMESTIC_OVERFLOW_PRIORITY_FEE,
    INTERNATIONAL_OVERFLOW_STEP_OZ,
    INTERNATIONAL_OVERFLOW_STANDARD_FEE,
    INTERNATIONAL_OVERFLOW_PRIORITY_FEE,
    getCountryGroup,
    getDomesticZoneSurcharge,
    getItemCountSurcharge,
    getWeightSurcharge,
    getOverflowSteps,
    getDomesticOverflowFee,
    getInternationalOverflowFee,
    getDomesticRates,
    getInternationalRates,
    getRates
  };
})();
