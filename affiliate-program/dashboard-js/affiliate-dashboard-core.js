window.AXIOM_AFFILIATE_DASHBOARD = {
  currentUser: null,
  affiliateProfile: null,
  initPromise: null,
  partialsLoaded: false,

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await this.waitForBaseDom();
      await this.loadDashboardPartials();
      this.cacheDom();
      this.bindAuthEvents();
      this.showAuth();
      await this.restoreSessionAndRender();
      return true;
    })().catch((error) => {
      console.error("[Affiliate Dashboard] init failed:", error);
      this.initPromise = null;
      throw error;
    });

    return this.initPromise;
  },

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async waitForBaseDom(maxAttempts = 120, delayMs = 100) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const hasAuthForm = !!document.getElementById("affiliateLoginForm");
      const hasDashboardMount = !!document.getElementById("affiliateDashboardMount");
      const hasOverviewMount = !!document.getElementById("affiliateOverviewMount");
      const hasLinksMount = !!document.getElementById("affiliateLinksMount");
      const hasCommissionsMount = !!document.getElementById("affiliateCommissionsMount");
      const hasClaimsMount = !!document.getElementById("affiliateClaimsMount");
      const hasPayoutsMount = !!document.getElementById("affiliatePayoutsMount");
      const hasHelpMount = !!document.getElementById("affiliateHelpMount");

      if (
        hasAuthForm &&
        hasDashboardMount &&
        hasOverviewMount &&
        hasLinksMount &&
        hasCommissionsMount &&
        hasClaimsMount &&
        hasPayoutsMount &&
        hasHelpMount
      ) {
        return true;
      }

      await this.wait(delayMs);
    }

    throw new Error("Affiliate dashboard DOM not ready.");
  },

  async loadDashboardPartials() {
    if (this.partialsLoaded) {
      return true;
    }

    const partials = [
      ["partials/affiliate-overview.html", "affiliateOverviewMount"],
      ["partials/affiliate-links.html", "affiliateLinksMount"],
      ["partials/affiliate-commissions.html", "affiliateCommissionsMount"],
      ["partials/affiliate-claims.html", "affiliateClaimsMount"],
      ["partials/affiliate-payouts.html", "affiliatePayoutsMount"],
      ["partials/affiliate-help.html", "affiliateHelpMount"]
    ];

    const results = [];

    for (const [file, mountId] of partials) {
      const mount = document.getElementById(mountId);

      if (!mount) {
        console.error("[Affiliate Dashboard] Missing partial mount:", mountId);
        results.push(false);
        continue;
      }

      if (mount.dataset.loaded === "true" && String(mount.innerHTML || "").trim()) {
        results.push(true);
        continue;
      }

      try {
        const response = await fetch(file, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load " + file + " (" + response.status + ")");
        }

        mount.innerHTML = await response.text();
        mount.dataset.loaded = "true";
        mount.dataset.source = file;
        results.push(true);
      } catch (error) {
        console.error("[Affiliate Dashboard] Partial load failed:", file, error);
        mount.dataset.loaded = "false";
        results.push(false);
      }
    }

    this.partialsLoaded = results.every(Boolean);

    if (!this.partialsLoaded) {
      throw new Error("One or more affiliate dashboard partials failed to load.");
    }

    return true;
  },

  cacheDom() {
    this.guestView = document.getElementById("affiliateGuestView");
    this.dashboardView = document.getElementById("affiliateDashboardView");
    this.pendingView = document.getElementById("affiliatePendingView");
    this.rejectedView = document.getElementById("affiliateRejectedView");
    this.suspendedView = document.getElementById("affiliateSuspendedView");

    this.authCard = document.getElementById("affiliateAuthCard");
    this.messageEl = document.getElementById("affiliateAuthMessage");
    this.loginForm = document.getElementById("affiliateLoginForm");
    this.signupForm = document.getElementById("affiliateSignupForm");
    this.loginTab = document.getElementById("affiliateLoginTab");
    this.signupTab = document.getElementById("affiliateSignupTab");
    this.logoutBtn = document.getElementById("affiliateLogoutBtn");
    this.dashboardWrap = document.getElementById("affiliateDashboardWrap");

    this.dashboardSectionIds = [
      "affiliateOverviewMount",
      "affiliateLinksMount",
      "affiliateCommissionsMount",
      "affiliateClaimsMount",
      "affiliatePayoutsMount",
      "affiliateHelpMount"
    ];

    return this;
  },

  refreshDomReferences() {
    return this.cacheDom();
  },

  getSupabase() {
    return window.axiomSupabase || window.AXIOM_SUPABASE || window.supabaseClient || null;
  },

  hideAllPrimaryViews() {
    [
      this.guestView,
      this.dashboardView,
      this.pendingView,
      this.rejectedView,
      this.suspendedView
    ].forEach((el) => {
      if (!el) return;
      el.hidden = true;
      el.style.display = "none";
    });
  },

  showGuestView() {
    this.refreshDomReferences();
    this.hideAllPrimaryViews();
    if (this.guestView) {
      this.guestView.hidden = false;
      this.guestView.style.display = "";
    }
  },

  showApprovedDashboardView() {
    this.refreshDomReferences();
    this.hideAllPrimaryViews();
    if (this.dashboardView) {
      this.dashboardView.hidden = false;
      this.dashboardView.style.display = "";
    }
  },

  showPendingView() {
    this.refreshDomReferences();
    this.hideAllPrimaryViews();
    if (this.pendingView) {
      this.pendingView.hidden = false;
      this.pendingView.style.display = "";
    }
  },

  showRejectedView() {
    this.refreshDomReferences();
    this.hideAllPrimaryViews();
    if (this.rejectedView) {
      this.rejectedView.hidden = false;
      this.rejectedView.style.display = "";
    }
  },

  showSuspendedView() {
    this.refreshDomReferences();
    this.hideAllPrimaryViews();
    if (this.suspendedView) {
      this.suspendedView.hidden = false;
      this.suspendedView.style.display = "";
    }
  },

  hideDashboardSections() {
    this.refreshDomReferences();

    if (this.dashboardWrap) {
      this.dashboardWrap.hidden = true;
      this.dashboardWrap.style.display = "none";
    }

    (this.dashboardSectionIds || []).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.style.display = "none";
    });
  },

  showDashboardSections() {
    this.refreshDomReferences();

    if (this.dashboardWrap) {
      this.dashboardWrap.hidden = false;
      this.dashboardWrap.style.display = "";
    }

    (this.dashboardSectionIds || []).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = false;
      el.style.display = "";
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

  formatMoney(value) {
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

  escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  normalizeCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 12);
  },

  getReferralCodeInput() {
    return document.getElementById("affiliateReferralCodeInput");
  },

  getReferralCodeSaveButton() {
    return document.getElementById("affiliateSaveReferralCodeBtn");
  },

  getReferralCodeCopyButton() {
    return document.getElementById("affiliateCopyReferralCodeBtn");
  },

  getReferralCodeStatusEl() {
    return document.getElementById("affiliateReferralCodeStatus");
  },

  setReferralCodeStatus(message, type) {
    const el = this.getReferralCodeStatusEl();
    if (!el) return;

    const normalized = typeof message === "string" ? message.trim() : "";

    if (!normalized) {
      el.hidden = true;
      el.textContent = "";
      el.className = "affiliate-inline-message";
      return;
    }

    el.hidden = false;
    el.textContent = normalized;
    el.className = "affiliate-inline-message" + (type ? " is-" + type : "");
  },

  syncReferralCodeUi(code) {
    const normalized = this.normalizeCode(code);
    const input = this.getReferralCodeInput();
    const copyBtn = this.getReferralCodeCopyButton();
    const linkInput = document.getElementById("affiliateGeneratedLink");
    const linkCopyBtn = document.getElementById("affiliateCopyGeneratedLinkBtn");

    if (input) {
      input.value = normalized;
    }

    if (copyBtn) {
      copyBtn.dataset.affiliateCopy = normalized;
    }

    const targetPathEl = document.getElementById("affiliateTargetPath");
    const customPath = targetPathEl && targetPathEl.value ? targetPathEl.value.trim() : "/";
    const url = normalized ? this.buildAffiliateTrackingUrl(customPath, normalized) : "";

    if (linkInput) {
      linkInput.value = url;
    }

    if (linkCopyBtn) {
      linkCopyBtn.dataset.affiliateCopy = url;
    }
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
    return document.getElementById("affiliateClaimPayoutContact");
  },

  setClaimButtonState(state) {
    const button = document.getElementById("submitAffiliateClaimBtn");
    if (!button) return;

    if (state === "disabled") {
      button.disabled = true;
      button.textContent = "Nothing Available";
      return;
    }

    if (state === "loading") {
      button.disabled = true;
      button.textContent = "Submitting...";
      return;
    }

    button.disabled = false;
    button.textContent = "Submit Claim";
  },

  updateClaimPayoutFieldVisibility() {
    const methodInput = this.getClaimPayoutMethodInput();
    const networkRow = document.getElementById("affiliateClaimPayoutNetworkRow");
    const addressRow = document.getElementById("affiliateClaimPayoutAddressRow");
    const contactRow = document.getElementById("affiliateClaimPayoutContactRow");

    const method = methodInput ? String(methodInput.value || "").trim().toLowerCase() : "";

    const showCrypto = method === "crypto";
    const showContact = method === "paypal" || method === "zelle" || method === "venmo";

    if (networkRow) {
      networkRow.hidden = !showCrypto;
      networkRow.style.display = showCrypto ? "" : "none";
    }

    if (addressRow) {
      addressRow.hidden = !(showCrypto || showContact);
      addressRow.style.display = showCrypto || showContact ? "" : "none";
    }

    if (contactRow) {
      contactRow.hidden = !showContact;
      contactRow.style.display = showContact ? "" : "none";
    }
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
