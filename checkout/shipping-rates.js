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
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 4.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 8.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 8,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 5.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 9.45, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 12,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 6.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 10.25, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 16,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 7.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 11.25, eta: "1–3 business days" }
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
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 12.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 16.95, eta: "1–3 business days" }
      ]
    },
    {
      maxWeightOz: 80,
      methods: [
        { id: "usps_ground_advantage", label: "USPS Ground Advantage", amount: 15.95, eta: "2–5 business days" },
        { id: "usps_priority_mail", label: "USPS Priority Mail", amount: 21.95, eta: "1–3 business days" }
      ]
    }
  ];

  const INTERNATIONAL_RATES = {
    canada: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 15.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 29.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 19.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 34.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 24.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 42.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 31.95, eta: "7–14 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 54.95, eta: "6–10 business days" }
        ]
      }
    ],

    uk: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 18.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 31.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 23.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 38.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 29.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 48.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 37.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 59.95, eta: "6–10 business days" }
        ]
      }
    ],

    europe: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 18.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 32.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 23.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 39.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 30.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 49.95, eta: "6–10 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 38.95, eta: "7–16 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 61.95, eta: "6–10 business days" }
        ]
      }
    ],

    oceania: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 19.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 34.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 25.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 41.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 33.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 52.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 42.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 65.95, eta: "6–12 business days" }
        ]
      }
    ],

    asia: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 19.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 33.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 25.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 40.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 33.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 51.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 43.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 64.95, eta: "6–12 business days" }
        ]
      }
    ],

    latin_america: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 18.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 33.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 24.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 40.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 31.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 50.95, eta: "6–12 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 40.95, eta: "8–18 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 63.95, eta: "6–12 business days" }
        ]
      }
    ],

    rest_of_world: [
      {
        maxWeightOz: 8,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 21.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 36.95, eta: "6–14 business days" }
        ]
      },
      {
        maxWeightOz: 16,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 27.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 43.95, eta: "6–14 business days" }
        ]
      },
      {
        maxWeightOz: 32,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 35.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 54.95, eta: "6–14 business days" }
        ]
      },
      {
        maxWeightOz: 48,
        methods: [
          { id: "intl_standard", label: "International Standard", amount: 45.95, eta: "8–20 business days" },
          { id: "usps_priority_mail_international", label: "USPS Priority Mail International", amount: 68.95, eta: "6–14 business days" }
        ]
      }
    ]
  };

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
      return 4;
    }

    if (/^(995|996|997|998|999)/.test(normalized)) {
      return 5;
    }

    if (/^(006|007|009)/.test(normalized)) {
      return 3;
    }

    return 0;
  }

  function cloneMethods(methods) {
    return (Array.isArray(methods) ? methods : []).map(function (method) {
      return {
        ...method,
        amount: toNumber(method.amount, 0)
      };
    });
  }

  function getDomesticRates(weightOz, postalCode) {
    const normalizedWeightOz = Math.max(toNumber(weightOz, 0), 0.01);
    const matchedTier =
      DOMESTIC_RATES.find(function (tier) {
        return normalizedWeightOz <= tier.maxWeightOz;
      }) || DOMESTIC_RATES[DOMESTIC_RATES.length - 1];

    const surcharge = getDomesticZoneSurcharge(postalCode);

    return cloneMethods(matchedTier.methods).map(function (method) {
      return {
        ...method,
        amount: Number((method.amount + surcharge).toFixed(2)),
        currency: "USD",
        country_group: "domestic"
      };
    });
  }

  function getInternationalRates(weightOz, countryCode) {
    const group = getCountryGroup(countryCode);
    const rateTable = INTERNATIONAL_RATES[group] || INTERNATIONAL_RATES.rest_of_world;
    const normalizedWeightOz = Math.max(toNumber(weightOz, 0), 0.01);

    const matchedTier =
      rateTable.find(function (tier) {
        return normalizedWeightOz <= tier.maxWeightOz;
      }) || rateTable[rateTable.length - 1];

    return cloneMethods(matchedTier.methods).map(function (method) {
      return {
        ...method,
        currency: "USD",
        country_group: group
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
      ? getDomesticRates(weightOz, postalCode)
      : getInternationalRates(weightOz, countryCode);

    return {
      countryCode: countryCode,
      postalCode: postalCode,
      itemCount: itemCount,
      weightOz: weightOz,
      weightLbs: Number((weightOz / 16).toFixed(3)),
      isDomestic: isDomestic,
      methods: methods
    };
  }

  return {
    COUNTRY_GROUPS,
    DOMESTIC_RATES,
    INTERNATIONAL_RATES,
    getCountryGroup,
    getDomesticZoneSurcharge,
    getDomesticRates,
    getInternationalRates,
    getRates
  };
})();
