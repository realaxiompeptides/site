(function () {
  function safeLower(value) {
    return String(value || "").trim().toLowerCase();
  }

  function safeText(value, fallback) {
    if (value === null || typeof value === "undefined") {
      return fallback || "";
    }
    return String(value);
  }

  function safeNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function formatCurrency(value) {
    const amount = safeNumber(value, 0);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(amount);
    } catch (error) {
      return "$" + amount.toFixed(2);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function debounce(fn, wait) {
    let timeoutId = null;

    return function debouncedFunction() {
      const context = this;
      const args = arguments;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function normalizeAffiliate(raw) {
    const affiliate = raw || {};

    const totalClicksLive = safeNumber(
      affiliate.total_clicks_live,
      safeNumber(affiliate.total_clicks, 0)
    );

    const totalConversionsLive = safeNumber(
      affiliate.total_conversions_live,
      safeNumber(affiliate.total_conversions, 0)
    );

    const claimableCommission = safeNumber(
      affiliate.claimable_commission != null
        ? affiliate.claimable_commission
        : affiliate.claimable_amount,
      0
    );

    return {
      id: safeText(affiliate.id, ""),
      auth_user_id: safeText(affiliate.auth_user_id, ""),
      email: safeText(affiliate.email, ""),
      full_name: safeText(affiliate.full_name, ""),
      discord_username: safeText(
        affiliate.discord_username || affiliate.discord_contact,
        ""
      ),
      referral_code: safeText(affiliate.referral_code, ""),
      status: safeLower(affiliate.status || "pending") || "pending",

      commission_type: safeText(affiliate.commission_type, "percent"),
      commission_value: safeNumber(affiliate.commission_value, 0),
      discount_type: safeText(affiliate.discount_type, "percent"),
      discount_value: safeNumber(affiliate.discount_value, 0),

      total_clicks: safeNumber(affiliate.total_clicks, 0),
      total_clicks_live: totalClicksLive,

      total_conversions: safeNumber(affiliate.total_conversions, 0),
      total_conversions_live: totalConversionsLive,

      total_commission_earned: safeNumber(affiliate.total_commission_earned, 0),
      total_commission_paid: safeNumber(affiliate.total_commission_paid, 0),

      claimable_commission: claimableCommission,
      claimable_amount: claimableCommission,

      pending_claim_requests: safeNumber(affiliate.pending_claim_requests, 0),

      payout_email: safeText(affiliate.payout_email, ""),
      notes: safeText(affiliate.notes, ""),
      created_at: affiliate.created_at || null,
      updated_at: affiliate.updated_at || null,

      raw: affiliate
    };
  }

  function calculateSummary(affiliates) {
    const rows = Array.isArray(affiliates) ? affiliates : [];

    return rows.reduce(
      function (summary, affiliate) {
        const status = safeLower(affiliate.status);

        summary.total += 1;

        if (status === "pending") {
          summary.pending += 1;
        }

        if (status === "approved") {
          summary.approved += 1;
        }

        summary.claimable += safeNumber(
          affiliate.claimable_commission != null
            ? affiliate.claimable_commission
            : affiliate.claimable_amount,
          0
        );

        return summary;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        claimable: 0
      }
    );
  }

  function filterAffiliates(affiliates, filters) {
    const rows = Array.isArray(affiliates) ? affiliates : [];
    const activeFilters = filters || {};
    const search = safeLower(activeFilters.search);
    const status = safeLower(activeFilters.status || "all");

    return rows.filter(function (affiliate) {
      const matchesStatus =
        status === "all" || safeLower(affiliate.status) === status;

      if (!matchesStatus) return false;

      if (!search) return true;

      const haystack = [
        affiliate.full_name,
        affiliate.email,
        affiliate.referral_code,
        affiliate.discord_username,
        affiliate.status
      ]
        .map(safeLower)
        .join(" ");

      return haystack.indexOf(search) !== -1;
    });
  }

  window.AXIOM_ADMIN_AFFILIATES_UTILS = {
    safeLower: safeLower,
    safeText: safeText,
    safeNumber: safeNumber,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    debounce: debounce,
    normalizeAffiliate: normalizeAffiliate,
    calculateSummary: calculateSummary,
    filterAffiliates: filterAffiliates
  };
})();
