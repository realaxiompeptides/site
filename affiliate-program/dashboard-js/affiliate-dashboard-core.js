window.AXIOM_AFFILIATE_DASHBOARD = {
  currentUser: null,
  affiliateProfile: null,
  authSubscription: null,
  isRenderingDashboard: false,
  hasInitialized: false,
  initPromise: null,
  partialsLoaded: false,
  domCached: false,
  authEventsBound: false,
  delegatedEventsBound: false,

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    const self = this;

    this.initPromise = (async function () {
      const supabaseReady = await self.waitForSupabase(80, 125);
      await self.waitForBaseDom(80, 125);
      await self.loadDashboardPartialsOnce();
      self.cacheDom();
      self.bindAuthEvents();
      self.bindSupabaseAuthListener();

      if (!supabaseReady) {
        self.showAuth();
        self.setMessage("Supabase auth is not available.", "error");
        return;
      }

      if (!self.hasInitialized) {
        self.hasInitialized = true;
      }

      self.showAuth();
      await self.restoreSessionAndRender();
    })();

    return this.initPromise;
  },

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async waitForSupabase(maxAttempts = 80, delayMs = 125) {
    for (let i = 0; i < maxAttempts; i += 1) {
      const supabase = this.getSupabase();
      if (supabase && supabase.auth) {
        return true;
      }
      await this.wait(delayMs);
    }
    return false;
  },

  async waitForBaseDom(maxAttempts = 80, delayMs = 125) {
    for (let i = 0; i < maxAttempts; i += 1) {
      const hasGuest = !!document.getElementById("affiliateGuestView");
      const hasDashboard = !!document.getElementById("affiliateDashboardView");
      const hasWrap = !!document.getElementById("affiliateDashboardWrap");

      if (hasGuest || hasDashboard || hasWrap) {
        return true;
      }

      await this.wait(delayMs);
    }

    return false;
  },

  async loadDashboardPartialsOnce() {
    if (this.partialsLoaded) {
      return;
    }

    const mounts = [
      { id: "affiliateOverviewMount", file: "partials/affiliate-overview.html" },
      { id: "affiliateLinksMount", file: "partials/affiliate-links.html" },
      { id: "affiliateCommissionsMount", file: "partials/affiliate-commissions.html" },
      { id: "affiliateClaimsMount", file: "partials/affiliate-claims.html" },
      { id: "affiliatePayoutsMount", file: "partials/affiliate-payouts.html" },
      { id: "affiliateHelpMount", file: "partials/affiliate-help.html" }
    ];

    await Promise.all(
      mounts.map(async (item) => {
        const mount = document.getElementById(item.id);
        if (!mount) return;

        if (mount.dataset.loaded === "true") {
          return;
        }

        try {
          const response = await fetch(item.file, { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Failed to load " + item.file);
          }
          mount.innerHTML = await response.text();
          mount.dataset.loaded = "true";
        } catch (error) {
          console.error("[Affiliate Dashboard] Partial load failed:", item.file, error);
        }
      })
    );

    this.partialsLoaded = true;
  },

  cacheDom() {
    this.guestView = document.getElementById("affiliateGuestView");
    this.dashboardView = document.getElementById("affiliateDashboardView");

    this.messageEl = document.getElementById("affiliateAuthMessage");
    this.authCard = document.getElementById("affiliateAuthCard");
    this.loginForm = document.getElementById("affiliateLoginForm");
    this.signupForm = document.getElementById("affiliateSignupForm");
    this.loginTab = document.getElementById("affiliateLoginTab");
    this.signupTab = document.getElementById("affiliateSignupTab");
    this.dashboardWrap = document.getElementById("affiliateDashboardWrap");
    this.logoutBtn = document.getElementById("affiliateLogoutBtn");
    this.linkForm = document.getElementById("affiliateLinkGeneratorForm");
    this.claimForm = document.getElementById("affiliateClaimForm");

    this.dashboardSectionIds = [
      "affiliateOverviewMount",
      "affiliateLinksMount",
      "affiliateCommissionsMount",
      "affiliateClaimsMount",
      "affiliatePayoutsMount",
      "affiliateHelpMount"
    ];

    this.domCached = true;
  },

  getSupabase() {
    return window.axiomSupabase || window.AXIOM_SUPABASE || window.supabaseClient || null;
  },

  getReferralCodeInput() {
    return (
      document.getElementById("affiliateReferralCodeInput") ||
      document.getElementById("affiliateDiscountCodeInput") ||
      document.getElementById("affiliateCodeInput") ||
      null
    );
  },

  getReferralCodeSaveButton() {
    return (
      document.getElementById("affiliateSaveReferralCodeBtn") ||
      document.getElementById("affiliateUpdateReferralCodeBtn") ||
      document.getElementById("affiliateSaveDiscountCodeBtn") ||
      document.getElementById("affiliateUpdateCodeBtn") ||
      null
    );
  },

  getReferralCodeCopyButton() {
    return (
      document.getElementById("affiliateCopyReferralCodeBtn") ||
      document.getElementById("affiliateCopyDiscountCodeBtn") ||
      document.getElementById("affiliateCopyCodeBtn") ||
      null
    );
  },

  getReferralCodeStatusEl() {
    return (
      document.getElementById("affiliateReferralCodeStatus") ||
      document.getElementById("affiliateDiscountCodeStatus") ||
      document.getElementById("affiliateCodeStatus") ||
      document.getElementById("affiliateReferralCodeMessage") ||
      null
    );
  },

  getClaimAmountInput() {
    return document.getElementById("affiliateClaimAmount");
  },

  getClaimNoteInput() {
    return document.getElementById("affiliateClaimNote");
  },

  getClaimPayoutMethodInput() {
    return document.getElementById("affiliateClaimPayoutMethod");
  },

  getClaimPayoutNetworkInput() {
    return document.getElementById("affiliateClaimPayoutNetwork");
  },

  getClaimPayoutAddressInput() {
    return document.getElementById("affiliateClaimPayoutAddress");
  },

  getClaimBackupContactInput() {
    return (
      document.getElementById("affiliateClaimPayoutContact") ||
      document.getElementById("affiliateClaimBackupContact") ||
      null
    );
  },

  getClaimSubmitButton() {
    return document.getElementById("submitAffiliateClaimBtn");
  },

  normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 12);
  },

  toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  },

  getSafeAffiliateId() {
    return this.affiliateProfile && this.affiliateProfile.id
      ? String(this.affiliateProfile.id)
      : "";
  },

  getSafeDiscordContact() {
    return this.affiliateProfile && this.affiliateProfile.discord_username
      ? String(this.affiliateProfile.discord_username).trim()
      : "";
  },

  getClaimStatusLabel(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "approved") return "Approved";
    if (value === "paid") return "Paid";
    if (value === "rejected") return "Rejected";
    return "Pending";
  },

  getClaimStatusClass(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "approved") return "is-approved";
    if (value === "paid") return "is-paid";
    if (value === "rejected") return "is-rejected";
    return "is-pending";
  },

  getPayoutStatusLabel(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "paid") return "Paid";
    if (value === "cancelled") return "Cancelled";
    return "Pending";
  },

  getPayoutStatusClass(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "paid") return "is-paid";
    if (value === "cancelled") return "is-rejected";
    return "is-pending";
  },

  getCommissionStatusLabel(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "claimable") return "Claimable";
    if (value === "claimed") return "Claimed";
    if (value === "paid") return "Paid";
    if (value === "voided") return "Voided";
    return "Pending";
  },

  escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  getSiteRootPath() {
    let pathname = window.location.pathname || "/";

    pathname = pathname.replace(/\/+$/, "");

    pathname = pathname
      .replace(/\/affiliate-program\/affiliate-dashboard\.html$/i, "")
      .replace(/\/affiliate-program\/affiliate-program\.html$/i, "")
      .replace(/affiliate-program\/affiliate-dashboard\.html$/i, "")
      .replace(/affiliate-program\/affiliate-program\.html$/i, "");

    if (!pathname) return "";

    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  },

  buildAffiliateUrl(customPath = "/") {
    const code = (this.affiliateProfile && this.affiliateProfile.referral_code) || "";
    if (!code) return "";

    const origin = window.location.origin;
    const siteRoot = this.getSiteRootPath();

    let normalizedPath = String(customPath || "/").trim();
    if (!normalizedPath) normalizedPath = "/";
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }

    return origin + siteRoot + normalizedPath + "?ref=" + encodeURIComponent(code);
  },

  setReferralCodeStatus(message, type) {
    const el = this.getReferralCodeStatusEl();
    if (!el) return;

    el.textContent = message || "";
    el.classList.remove("is-active", "success", "error");

    if (message) {
      el.classList.add("is-active", type === "error" ? "error" : "success");
    }
  },

  syncReferralCodeUi(code) {
    const cleanCode = this.normalizeCode(code || "");

    const input = this.getReferralCodeInput();
    if (input) {
      input.value = cleanCode;
    }

    this.setText("affiliateDashboardCode", cleanCode || "—");

    const generatedLinkInput = document.getElementById("affiliateGeneratedLink");
    if (generatedLinkInput) {
      generatedLinkInput.value = cleanCode ? this.buildAffiliateUrl("/") : "";
    }
  },

  setMessage(message, type) {
    if (!this.messageEl) return;

    this.messageEl.textContent = message || "";
    this.messageEl.classList.remove("is-active", "success", "error");

    if (message) {
      this.messageEl.classList.add("is-active", type || "success");
    }
  },

  setClaimButtonState(mode) {
    const claimButton = this.getClaimSubmitButton();
    if (!claimButton) return;

    if (!claimButton.dataset.defaultText) {
      claimButton.dataset.defaultText = claimButton.textContent || "Submit Claim Request";
    }

    if (mode === "loading") {
      claimButton.disabled = true;
      claimButton.dataset.loading = "true";
      claimButton.textContent = "Submitting...";
      return;
    }

    delete claimButton.dataset.loading;

    if (mode === "disabled") {
      claimButton.disabled = true;
      claimButton.textContent = "No Claimable Balance Available";
      return;
    }

    claimButton.disabled = false;
    claimButton.textContent = claimButton.dataset.defaultText || "Submit Claim Request";
  },

  formatMoney(value) {
    return "$" + Number(value || 0).toFixed(2);
  },

  formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  },

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }
};
