window.AXIOM_AFFILIATE_DASHBOARD = {
  currentUser: null,
  affiliateProfile: null,
  affiliateProfileIds: [],
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
      const baseDomReady = await self.waitForBaseDom(120, 100);
      if (!baseDomReady) {
        throw new Error("Affiliate dashboard shell did not load in time.");
      }

      const partialsReady = await self.loadDashboardPartialsOnce();
      if (!partialsReady) {
        throw new Error("Affiliate dashboard partials did not load in time.");
      }

      self.cacheDom();
      self.bindAuthEvents();

      const supabaseReady = await self.waitForSupabase(80, 125);

      if (!supabaseReady) {
        self.showAuth();
        self.setMessage("Supabase auth is not available.", "error");
        return;
      }

      self.bindSupabaseAuthListener();

      if (!self.hasInitialized) {
        self.hasInitialized = true;
      }

      await self.restoreSessionAndRender();
    })().catch(function (error) {
      console.error("[Affiliate Dashboard] init failed:", error);
      self.initPromise = null;
      throw error;
    });

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
      const hasDashboardView = !!document.getElementById("affiliateDashboardView");
      const hasAuthMount = !!document.getElementById("affiliateAuthMount");
      const hasDashboardMount = !!document.getElementById("affiliateDashboardMount");
      const hasAuthForm = !!document.getElementById("affiliateLoginForm");
      const hasOverviewMount = !!document.getElementById("affiliateOverviewMount");

      if (
        hasGuest &&
        hasDashboardView &&
        hasAuthMount &&
        hasDashboardMount &&
        hasAuthForm &&
        hasOverviewMount
      ) {
        return true;
      }

      await this.wait(delayMs);
    }

    return false;
  },

  async loadDashboardPartialsOnce() {
    const mounts = [
      { id: "affiliateOverviewMount", file: "partials/affiliate-overview.html" },
      { id: "affiliateLinksMount", file: "partials/affiliate-links.html" },
      { id: "affiliateCommissionsMount", file: "partials/affiliate-commissions.html" },
      { id: "affiliateClaimsMount", file: "partials/affiliate-claims.html" },
      { id: "affiliatePayoutsMount", file: "partials/affiliate-payouts.html" },
      { id: "affiliateHelpMount", file: "partials/affiliate-help.html" }
    ];

    let foundAllMounts = true;
    let loadedAllMounts = true;

    for (const item of mounts) {
      const mount = document.getElementById(item.id);

      if (!mount) {
        foundAllMounts = false;
        loadedAllMounts = false;
        console.warn("[Affiliate Dashboard] Missing partial mount:", item.id);
        continue;
      }

      if (mount.dataset.loaded === "true") {
        continue;
      }

      try {
        const response = await fetch(item.file, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load " + item.file + " (" + response.status + ")");
        }
        mount.innerHTML = await response.text();
        mount.dataset.loaded = "true";
      } catch (error) {
        loadedAllMounts = false;
        mount.dataset.loaded = "false";
        console.error("[Affiliate Dashboard] Partial load failed:", item.file, error);
      }
    }

    this.partialsLoaded = foundAllMounts && loadedAllMounts;
    return this.partialsLoaded;
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

  refreshDomReferences() {
    this.cacheDom();
    return this;
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

  getClaimPayoutContactInput() {
    return (
      document.getElementById("affiliateClaimPayoutContact") ||
      document.getElementById("affiliateClaimBackupContact") ||
      null
    );
  },

  getClaimSubmitButton() {
    return document.getElementById("submitAffiliateClaimBtn");
  },

  getApprovedStatus() {
    const rawStatus =
      this.affiliateProfile &&
      typeof this.affiliateProfile.status === "string"
        ? this.affiliateProfile.status
        : "";

    return rawStatus.trim().toLowerCase();
  },

  isApprovedAffiliate() {
    return this.getApprovedStatus() === "approved";
  },

  isPendingAffiliate() {
    return this.getApprovedStatus() === "pending";
  },

  isRejectedAffiliate() {
    return this.getApprovedStatus() === "rejected";
  },

  isSuspendedAffiliate() {
    return this.getApprovedStatus() === "suspended";
  },

  hideAllPrimaryViews() {
    const views = [
      document.getElementById("affiliateGuestView"),
      document.getElementById("affiliateDashboardView"),
      document.getElementById("affiliatePendingView"),
      document.getElementById("affiliateRejectedView"),
      document.getElementById("affiliateSuspendedView")
    ];

    views.forEach((view) => {
      if (!view) return;
      view.hidden = true;
      view.style.display = "none";
    });
  },

  showGuestView() {
    this.hideAllPrimaryViews();

    const view = document.getElementById("affiliateGuestView");
    if (view) {
      view.hidden = false;
      view.style.display = "";
    }
  },

  showApprovedDashboardView() {
    this.hideAllPrimaryViews();

    const view = document.getElementById("affiliateDashboardView");
    if (view) {
      view.hidden = false;
      view.style.display = "";
    }
  },

  showPendingView() {
    this.hideAllPrimaryViews();

    const view = document.getElementById("affiliatePendingView");
    if (view) {
      view.hidden = false;
      view.style.display = "";
    }
  },

  showRejectedView() {
    this.hideAllPrimaryViews();

    const view = document.getElementById("affiliateRejectedView");
    if (view) {
      view.hidden = false;
      view.style.display = "";
    }
  },

  showSuspendedView() {
    this.hideAllPrimaryViews();

    const view = document.getElementById("affiliateSuspendedView");
    if (view) {
      view.hidden = false;
      view.style.display = "";
    }
  },

  showDashboardSections() {
    this.refreshDomReferences();

    if (this.dashboardWrap) {
      this.dashboardWrap.hidden = false;
      this.dashboardWrap.style.display = "";
    }

    (this.dashboardSectionIds || []).forEach((id) => {
      const section = document.getElementById(id);
      if (!section) return;
      section.hidden = false;
      section.style.display = "";
    });
  },

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value == null || value === "" ? "—" : String(value);
    }
  },

  setHtml(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = value == null || value === "" ? "—" : String(value);
    }
  },

  formatCurrency(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number.isFinite(amount) ? amount : 0);
  },

  formatNumber(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-US").format(Number.isFinite(amount) ? amount : 0);
  },

  formatDate(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  },

  setMessage(message, type) {
    this.refreshDomReferences();

    if (!this.messageEl) return;

    const normalized = typeof message === "string" ? message.trim() : "";

    if (!normalized) {
      this.messageEl.hidden = true;
      this.messageEl.textContent = "";
      this.messageEl.className = "affiliate-auth-message";
      return;
    }

    this.messageEl.hidden = false;
    this.messageEl.textContent = normalized;
    this.messageEl.className = "affiliate-auth-message" + (type ? " is-" + type : "");
  },

  setReferralCodeStatus(message, type) {
    const statusEl = this.getReferralCodeStatusEl();
    if (!statusEl) return;

    const normalized = typeof message === "string" ? message.trim() : "";

    if (!normalized) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.className = "affiliate-inline-message";
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = normalized;
    statusEl.className = "affiliate-inline-message" + (type ? " is-" + type : "");
  },

  normalizeCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 12);
  },

  async copyValue(value, triggerEl) {
    const text = String(value || "").trim();
    if (!text) return false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "readonly");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }

      if (triggerEl) {
        const original = triggerEl.textContent;
        triggerEl.textContent = "Copied";
        setTimeout(() => {
          triggerEl.textContent = original;
        }, 1200);
      }

      return true;
    } catch (error) {
      console.error("[Affiliate Dashboard] Copy failed:", error);
      return false;
    }
  }
};
