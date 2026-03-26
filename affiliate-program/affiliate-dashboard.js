window.AXIOM_AFFILIATE_DASHBOARD = {
  currentUser: null,
  affiliateProfile: null,

  async init() {
    await this.loadDashboardPartials();
    this.cacheDom();
    this.bindAuthEvents();
    this.showAuth();
    await this.restoreSessionAndRender();
  },

  async loadDashboardPartials() {
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

        try {
          const response = await fetch(item.file, { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Failed to load " + item.file);
          }
          mount.innerHTML = await response.text();
        } catch (error) {
          console.error(error);
        }
      })
    );
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
      document.getElementById("affiliateClaimBackupContact")
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
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const siteRoot = pathname
        .replace("/affiliate-program/affiliate-program.html", "")
        .replace("affiliate-program/affiliate-program.html", "");
      const normalizedSiteRoot = siteRoot.endsWith("/") ? siteRoot.slice(0, -1) : siteRoot;

      generatedLinkInput.value = cleanCode
        ? origin + normalizedSiteRoot + "/?ref=" + encodeURIComponent(cleanCode)
        : "";
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

  bindAuthEvents() {
    if (this.loginTab && !this.loginTab.dataset.bound) {
      this.loginTab.dataset.bound = "true";
      this.loginTab.addEventListener("click", () => this.showLogin());
    }

    if (this.signupTab && !this.signupTab.dataset.bound) {
      this.signupTab.dataset.bound = "true";
      this.signupTab.addEventListener("click", () => this.showSignup());
    }

    if (this.loginForm && !this.loginForm.dataset.bound) {
      this.loginForm.dataset.bound = "true";
      this.loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.signIn();
      });
    }

    if (this.signupForm && !this.signupForm.dataset.bound) {
      this.signupForm.dataset.bound = "true";
      this.signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.signUp();
      });
    }

    if (this.logoutBtn && !this.logoutBtn.dataset.bound) {
      this.logoutBtn.dataset.bound = "true";
      this.logoutBtn.addEventListener("click", async () => {
        await this.signOut();
      });
    }

    if (!document.body.dataset.affiliateDashboardDelegated) {
      document.body.dataset.affiliateDashboardDelegated = "true";

      document.addEventListener("click", (event) => {
        const generateBtn = event.target.closest("#generateAffiliateLinkBtn");
        const copyBtn = event.target.closest("[data-affiliate-copy]");
        const claimBtn = event.target.closest("#submitAffiliateClaimBtn");
        const saveCodeBtn = event.target.closest(
          "#affiliateSaveReferralCodeBtn, #affiliateUpdateReferralCodeBtn, #affiliateSaveDiscountCodeBtn, #affiliateUpdateCodeBtn"
        );
        const copyCodeBtn = event.target.closest(
          "#affiliateCopyReferralCodeBtn, #affiliateCopyDiscountCodeBtn, #affiliateCopyCodeBtn"
        );

        if (generateBtn) {
          event.preventDefault();
          this.generateTrackingLink();
          return;
        }

        if (copyBtn) {
          event.preventDefault();
          this.copyValue(copyBtn.getAttribute("data-affiliate-copy") || "", copyBtn);
          return;
        }

        if (claimBtn) {
          event.preventDefault();
          this.submitClaim();
          return;
        }

        if (saveCodeBtn) {
          event.preventDefault();
          this.updateOwnReferralCode();
          return;
        }

        if (copyCodeBtn) {
          event.preventDefault();
          const code = (this.affiliateProfile && this.affiliateProfile.referral_code) || "";
          this.copyValue(code, copyCodeBtn);
          return;
        }
      });

      document.addEventListener("input", (event) => {
        const codeInput = event.target.closest(
          "#affiliateReferralCodeInput, #affiliateDiscountCodeInput, #affiliateCodeInput"
        );

        if (codeInput) {
          const normalized = this.normalizeCode(codeInput.value);
          if (codeInput.value !== normalized) {
            codeInput.value = normalized;
          }
          this.setReferralCodeStatus("", "");
          return;
        }

        const payoutMethodSelect = event.target.closest("#affiliateClaimPayoutMethod");
        if (payoutMethodSelect) {
          this.updateClaimPayoutFieldVisibility();
          this.setMessage("", "");
          return;
        }

        const claimRelatedInput = event.target.closest(
          "#affiliateClaimAmount, #affiliateClaimNote, #affiliateClaimPayoutNetwork, #affiliateClaimPayoutAddress, #affiliateClaimPayoutContact, #affiliateClaimBackupContact"
        );
        if (claimRelatedInput) {
          this.setMessage("", "");
        }
      });

      document.addEventListener("change", (event) => {
        const payoutMethodSelect = event.target.closest("#affiliateClaimPayoutMethod");
        if (payoutMethodSelect) {
          this.updateClaimPayoutFieldVisibility();
          this.setMessage("", "");
        }
      });

      document.addEventListener("keydown", (event) => {
        const codeInput = event.target.closest(
          "#affiliateReferralCodeInput, #affiliateDiscountCodeInput, #affiliateCodeInput"
        );

        if (codeInput && event.key === "Enter") {
          event.preventDefault();
          this.updateOwnReferralCode();
          return;
        }

        const claimInput = event.target.closest(
          "#affiliateClaimAmount, #affiliateClaimNote, #affiliateClaimPayoutMethod, #affiliateClaimPayoutNetwork, #affiliateClaimPayoutAddress, #affiliateClaimPayoutContact, #affiliateClaimBackupContact"
        );

        if (claimInput && event.key === "Enter" && claimInput.id !== "affiliateClaimNote") {
          event.preventDefault();
          this.submitClaim();
        }
      });
    }
  },

  showLogin() {
    if (this.loginTab) this.loginTab.classList.add("is-active");
    if (this.signupTab) this.signupTab.classList.remove("is-active");

    if (this.loginForm) {
      this.loginForm.hidden = false;
      this.loginForm.style.display = "grid";
    }

    if (this.signupForm) {
      this.signupForm.hidden = true;
      this.signupForm.style.display = "none";
    }
  },

  showSignup() {
    if (this.signupTab) this.signupTab.classList.add("is-active");
    if (this.loginTab) this.loginTab.classList.remove("is-active");

    if (this.signupForm) {
      this.signupForm.hidden = false;
      this.signupForm.style.display = "grid";
    }

    if (this.loginForm) {
      this.loginForm.hidden = true;
      this.loginForm.style.display = "none";
    }
  },

  setPageMode(mode) {
    const isDashboard = mode === "dashboard";

    if (this.guestView) {
      this.guestView.hidden = isDashboard;
      this.guestView.style.display = isDashboard ? "none" : "";
    }

    if (this.dashboardView) {
      this.dashboardView.hidden = !isDashboard;
      this.dashboardView.style.display = isDashboard ? "" : "none";
    }
  },

  showGuestView() {
    this.setPageMode("guest");
  },

  showApprovedDashboardView() {
    this.setPageMode("dashboard");
  },

  hideDashboardSections() {
    this.dashboardSectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.hidden = true;
        el.style.display = "none";
      }
    });

    if (this.dashboardWrap) {
      this.dashboardWrap.hidden = true;
      this.dashboardWrap.style.display = "none";
    }
  },

  showDashboardSections() {
    this.dashboardSectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.hidden = false;
        el.style.display = "";
      }
    });

    if (this.dashboardWrap) {
      this.dashboardWrap.hidden = false;
      this.dashboardWrap.style.display = "";
    }
  },

  async restoreSessionAndRender() {
    if (!window.axiomSupabase || !window.axiomSupabase.auth) {
      this.setMessage("Supabase auth is not available.", "error");
      this.showAuth();
      return;
    }

    try {
      const result = await window.axiomSupabase.auth.getUser();
      const user = result && result.data ? result.data.user || null : null;
      this.currentUser = user;

      if (!user) {
        this.showAuth();
        return;
      }

      await this.loadAffiliateProfile();

      if (!this.affiliateProfile) {
        this.showAuth();
        this.setMessage("Affiliate profile not found. Please sign up for the affiliate program.", "error");
        this.showSignup();
        return;
      }

      if (this.affiliateProfile.status !== "approved") {
        this.showAuth();
        this.setMessage(
          "Your affiliate account is currently " +
            (this.affiliateProfile.status || "pending") +
            ". You will get dashboard access after approval.",
          "error"
        );
        this.showLogin();
        return;
      }

      await this.showDashboard();
      this.setMessage("");
    } catch (error) {
      console.error(error);
      this.showAuth();
    }
  },

  async signIn() {
    const emailEl = document.getElementById("affiliateLoginEmail");
    const passwordEl = document.getElementById("affiliateLoginPassword");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";

    if (!email || !password) {
      this.setMessage("Enter your email and password.", "error");
      return;
    }

    try {
      const result = await window.axiomSupabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) throw result.error;

      this.currentUser = result.data ? result.data.user || null : null;
      await this.loadAffiliateProfile();

      if (!this.affiliateProfile) {
        this.showAuth();
        this.setMessage("Affiliate profile not found. Please create an affiliate account first.", "error");
        this.showSignup();
        return;
      }

      if (this.affiliateProfile.status !== "approved") {
        this.showAuth();
        this.setMessage(
          "Your affiliate account is currently " +
            (this.affiliateProfile.status || "pending") +
            ". Dashboard access is available after approval.",
          "error"
        );
        this.showLogin();
        return;
      }

      await this.showDashboard();
      this.setMessage("");
    } catch (error) {
      console.error(error);
      this.setMessage(error.message || "Sign in failed.", "error");
    }
  },

  async signUp() {
    const nameEl = document.getElementById("affiliateSignupName");
    const emailEl = document.getElementById("affiliateSignupEmail");
    const passwordEl = document.getElementById("affiliateSignupPassword");
    const discordEl = document.getElementById("affiliateSignupDiscord");

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";
    const discord = discordEl ? discordEl.value.trim() : "";

    if (!name || !email || !password) {
      this.setMessage("Complete all required fields.", "error");
      return;
    }

    try {
      const result = await window.axiomSupabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (result.error) throw result.error;

      const userId = result.data && result.data.user ? result.data.user.id || null : null;
      const referralCode = this.generateReferralCode(name, email);

      if (userId) {
        const existingResult = await window.axiomSupabase
          .from("affiliates")
          .select("id, auth_user_id")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (existingResult.error) throw existingResult.error;

        if (existingResult.data && existingResult.data.id) {
          const updateResult = await window.axiomSupabase
            .from("affiliates")
            .update({
              email: email,
              full_name: name,
              discord_username: discord || null
            })
            .eq("id", existingResult.data.id);

          if (updateResult.error) throw updateResult.error;
        } else {
          const insertResult = await window.axiomSupabase
            .from("affiliates")
            .insert({
              auth_user_id: userId,
              email: email,
              full_name: name,
              discord_username: discord || null,
              referral_code: referralCode,
              status: "pending",
              commission_type: "percent",
              commission_value: 10,
              discount_type: "percent",
              discount_value: 10
            });

          if (insertResult.error) throw insertResult.error;
        }
      }

      this.showAuth();
      this.setMessage("Affiliate application submitted. Sign in after your account is approved.");
      this.showLogin();

      if (this.signupForm) {
        this.signupForm.reset();
      }
    } catch (error) {
      console.error(error);
      this.setMessage(error.message || "Sign up failed.", "error");
    }
  },

  async signOut() {
    try {
      await window.axiomSupabase.auth.signOut();
    } catch (error) {
      console.error(error);
    }

    this.currentUser = null;
    this.affiliateProfile = null;
    this.showAuth();
    this.setMessage("");
    this.setReferralCodeStatus("", "");
  },

  async loadAffiliateProfile() {
    if (!this.currentUser || !this.currentUser.id) {
      this.affiliateProfile = null;
      return;
    }

    try {
      const result = await window.axiomSupabase
        .from("affiliates")
        .select("*")
        .eq("auth_user_id", this.currentUser.id)
        .maybeSingle();

      if (result.error) throw result.error;

      this.affiliateProfile = result.data || null;
    } catch (error) {
      console.error(error);
      this.affiliateProfile = null;
    }
  },

  showAuth() {
    this.showGuestView();

    if (this.authCard) {
      this.authCard.hidden = false;
      this.authCard.style.display = "";
    }

    this.hideDashboardSections();
    this.showLogin();
  },

  async showDashboard() {
    this.showApprovedDashboardView();

    if (this.authCard) {
      this.authCard.hidden = true;
      this.authCard.style.display = "none";
    }

    this.showDashboardSections();
    await this.renderDashboard();
  },

  updateClaimPayoutFieldVisibility() {
    const methodInput = this.getClaimPayoutMethodInput();
    const networkInput = this.getClaimPayoutNetworkInput();
    const addressInput = this.getClaimPayoutAddressInput();

    if (!methodInput) return;

    const method = String(methodInput.value || "").trim().toLowerCase();
    const looksCrypto =
      method === "crypto" ||
      method === "btc" ||
      method === "bitcoin" ||
      method === "eth" ||
      method === "ethereum" ||
      method === "sol" ||
      method === "solana" ||
      method === "usdt" ||
      method === "usdc" ||
      method === "usdt-eth" ||
      method === "usdc-eth" ||
      method === "usdt-sol" ||
      method === "usdc-sol";

    if (networkInput) {
      networkInput.placeholder = looksCrypto
        ? "Ethereum / Solana / Bitcoin / TRON"
        : "Network / handle / platform";
    }

    if (addressInput) {
      addressInput.placeholder = looksCrypto
        ? "Enter your wallet address"
        : "Enter your payout address / username / email";
    }
  },

  getClaimPayoutDetails() {
    const payoutMethod = this.getClaimPayoutMethodInput();
    const payoutNetwork = this.getClaimPayoutNetworkInput();
    const payoutAddress = this.getClaimPayoutAddressInput();
    const backupContact = this.getClaimBackupContactInput();

    return {
      payoutMethod: payoutMethod ? String(payoutMethod.value || "").trim() : "",
      payoutNetwork: payoutNetwork ? String(payoutNetwork.value || "").trim() : "",
      payoutAddress: payoutAddress ? String(payoutAddress.value || "").trim() : "",
      backupContact: backupContact ? String(backupContact.value || "").trim() : ""
    };
  },

  validateClaimPayoutDetails() {
    const details = this.getClaimPayoutDetails();

    if (!details.payoutMethod) {
      return "Please choose a payout method.";
    }

    if (!details.payoutAddress) {
      return "Please enter your payout address.";
    }

    return "";
  },

  getDisplayCommissionRows(conversionRows, claimRows) {
    const rows = Array.isArray(conversionRows)
      ? conversionRows.map((row) => ({ ...row }))
      : [];

    const reservingClaims = (Array.isArray(claimRows) ? claimRows : [])
      .filter((claim) => {
        const status = String(claim.status || "").toLowerCase();
        return status === "pending" || status === "approved" || status === "paid";
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return aTime - bTime;
      });

    let reservedAmount = reservingClaims.reduce((sum, claim) => {
      return sum + Number(claim.amount || 0);
    }, 0);

    const claimableRowsOrdered = rows
      .filter((row) => String(row.commission_status || "").toLowerCase() === "claimable")
      .sort((a, b) => {
        const aTime = new Date(a.claimable_at || a.created_at || 0).getTime();
        const bTime = new Date(b.claimable_at || b.created_at || 0).getTime();
        return aTime - bTime;
      });

    claimableRowsOrdered.forEach((row) => {
      row.display_status = String(row.commission_status || "").toLowerCase();

      if (reservedAmount > 0) {
        row.display_status = "claimed";
        reservedAmount -= Number(row.commission_amount || 0);
      }
    });

    rows.forEach((row) => {
      if (!row.display_status) {
        row.display_status = String(row.commission_status || "").toLowerCase();
      }
    });

    return rows.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
  },

  async renderDashboard() {
    const profile = this.affiliateProfile;
    const email = (this.currentUser && this.currentUser.email) || "—";
    const fullName =
      (profile && profile.full_name) ||
      (this.currentUser &&
        this.currentUser.user_metadata &&
        this.currentUser.user_metadata.full_name) ||
      "—";

    this.setText("affiliateDashboardEmail", email);
    this.setText("affiliateDashboardEmailRow", email);
    this.setText("affiliateDashboardFullName", fullName);
    this.setText("affiliateDashboardStatus", (profile && profile.status) || "pending");
    this.setText("affiliateDashboardCode", (profile && profile.referral_code) || "—");
    this.setText(
      "affiliateDashboardCommissionRate",
      profile ? String(Number(profile.commission_value || 0)) + "%" : "—"
    );
    this.setText(
      "affiliateDashboardDiscountRate",
      profile ? String(Number(profile.discount_value || 0)) + "%" : "—"
    );

    this.syncReferralCodeUi((profile && profile.referral_code) || "");
    this.setReferralCodeStatus("", "");

    const stats = await this.fetchStats();

    this.setText("affiliateClicksCount", String(stats.clicks));
    this.setText("affiliateConversionsCount", String(stats.conversions));
    this.setText("affiliateClaimableAmount", this.formatMoney(stats.availableToClaim));
    this.setText("affiliatePaidAmount", this.formatMoney(stats.paid));
    this.setText("affiliatePendingClaimsAmount", this.formatMoney(stats.pendingClaims));
    this.setText("affiliateApprovedClaimsAmount", this.formatMoney(stats.approvedClaims));
    this.setText("affiliateRejectedClaimsAmount", this.formatMoney(stats.rejectedClaims));

    const claimAmountInput = this.getClaimAmountInput();
    if (claimAmountInput) {
      claimAmountInput.max = String(this.toNumber(stats.availableToClaim, 0).toFixed(2));
      claimAmountInput.placeholder =
        this.toNumber(stats.availableToClaim, 0) > 0
          ? this.toNumber(stats.availableToClaim, 0).toFixed(2)
          : "0.00";
      claimAmountInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;

      if (this.toNumber(stats.availableToClaim, 0) > 0 && !claimAmountInput.value) {
        claimAmountInput.value = this.toNumber(stats.availableToClaim, 0).toFixed(2);
      }
    }

    const claimNoteInput = this.getClaimNoteInput();
    if (claimNoteInput) {
      claimNoteInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
    }

    const payoutMethodInput = this.getClaimPayoutMethodInput();
    if (payoutMethodInput) {
      payoutMethodInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
    }

    const payoutNetworkInput = this.getClaimPayoutNetworkInput();
    if (payoutNetworkInput) {
      payoutNetworkInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
    }

    const payoutAddressInput = this.getClaimPayoutAddressInput();
    if (payoutAddressInput) {
      payoutAddressInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
    }

    const backupContactInput = this.getClaimBackupContactInput();
    if (backupContactInput) {
      backupContactInput.disabled = this.toNumber(stats.availableToClaim, 0) <= 0;
    }

    if (this.toNumber(stats.availableToClaim, 0) <= 0) {
      this.setClaimButtonState("disabled");
    } else {
      this.setClaimButtonState("ready");
    }

    const claimAvailableEl = document.getElementById("affiliateClaimAvailableAmount");
    if (claimAvailableEl) {
      claimAvailableEl.textContent = this.formatMoney(stats.availableToClaim);
    }

    const claimReservedEl = document.getElementById("affiliateClaimReservedAmount");
    if (claimReservedEl) {
      claimReservedEl.textContent = this.formatMoney(stats.pendingClaims);
    }

    const claimHelperText = document.getElementById("affiliateClaimHelperText");
    if (claimHelperText) {
      claimHelperText.textContent =
        stats.pendingClaims > 0
          ? "Pending and approved claim requests are temporarily reserved until reviewed or paid."
          : "You can only submit up to your currently available claimable balance.";
    }

    const code = (profile && profile.referral_code) || "";
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const siteRoot = pathname
      .replace("/affiliate-program/affiliate-program.html", "")
      .replace("affiliate-program/affiliate-program.html", "");

    const normalizedSiteRoot = siteRoot.endsWith("/") ? siteRoot.slice(0, -1) : siteRoot;
    const defaultLink = code
      ? origin + normalizedSiteRoot + "/?ref=" + encodeURIComponent(code)
      : "";

    const generatedLinkInput = document.getElementById("affiliateGeneratedLink");
    if (generatedLinkInput) {
      generatedLinkInput.value = defaultLink;
    }

    this.updateClaimPayoutFieldVisibility();
    this.renderRecentCommissions(stats.recentCommissions);
    this.renderPayouts(stats.payouts);
    this.renderClaims(stats.claims);
  },

  async fetchStats() {
    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      return {
        clicks: 0,
        conversions: 0,
        claimable: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        availableToClaim: 0,
        paid: 0,
        recentCommissions: [],
        payouts: [],
        claims: []
      };
    }

    try {
      const affiliateId = this.affiliateProfile.id;

      const results = await Promise.all([
        window.axiomSupabase
          .from("affiliate_clicks")
          .select("*", { count: "exact", head: true })
          .eq("affiliate_id", affiliateId),

        window.axiomSupabase
          .from("affiliate_conversions")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false }),

        window.axiomSupabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("paid_at", { ascending: false })
          .order("created_at", { ascending: false }),

        window.axiomSupabase
          .from("affiliate_claim_requests")
          .select("*")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false })
      ]);

      const clicksResult = results[0];
      const conversionsResult = results[1];
      const payoutsResult = results[2];
      const claimsResult = results[3];

      if (clicksResult.error) throw clicksResult.error;
      if (conversionsResult.error) throw conversionsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (claimsResult.error) throw claimsResult.error;

      const clicks = Number(clicksResult.count || 0);
      const conversionRows = Array.isArray(conversionsResult.data) ? conversionsResult.data : [];
      const payoutRows = Array.isArray(payoutsResult.data) ? payoutsResult.data : [];
      const claimRows = Array.isArray(claimsResult.data) ? claimsResult.data : [];

      const pendingClaims = claimRows
        .filter((item) => {
          const status = String(item.status || "").toLowerCase();
          return status === "pending" || status === "approved";
        })
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const approvedClaims = claimRows
        .filter((item) => String(item.status || "").toLowerCase() === "approved")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const rejectedClaims = claimRows
        .filter((item) => String(item.status || "").toLowerCase() === "rejected")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const paid = payoutRows
        .filter((item) => String(item.payout_status || "").toLowerCase() === "paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const displayConversionRows = this.getDisplayCommissionRows(conversionRows, claimRows);

      const availableToClaim = displayConversionRows
        .filter((item) => String(item.display_status || item.commission_status || "").toLowerCase() === "claimable")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

      return {
        clicks: clicks,
        conversions: conversionRows.length,
        claimable: availableToClaim,
        pendingClaims: pendingClaims,
        approvedClaims: approvedClaims,
        rejectedClaims: rejectedClaims,
        availableToClaim: availableToClaim,
        paid: paid,
        recentCommissions: displayConversionRows.slice(0, 6),
        payouts: payoutRows.slice(0, 20),
        claims: claimRows.slice(0, 20)
      };
    } catch (error) {
      console.error(error);
      return {
        clicks: 0,
        conversions: 0,
        claimable: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        availableToClaim: 0,
        paid: 0,
        recentCommissions: [],
        payouts: [],
        claims: []
      };
    }
  },

  renderRecentCommissions(rows) {
    const mount = document.getElementById("affiliateRecentCommissionsList");
    if (!mount) return;

    if (!rows || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No commissions yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        const statusText = this.getCommissionStatusLabel(row.display_status || row.commission_status || "pending");

        return (
          '<div class="affiliate-data-row">' +
            "<span>Order #" + (row.order_number || "—") + " · " + statusText + "</span>" +
            "<strong>" + this.formatMoney(row.commission_amount || 0) + "</strong>" +
          "</div>"
        );
      })
      .join("");
  },

  renderPayouts(rows) {
    const mount = document.getElementById("affiliatePayoutsList");
    if (!mount) return;

    if (!rows || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No payouts yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        const statusLabel = this.getPayoutStatusLabel(row.payout_status);
        const statusClass = this.getPayoutStatusClass(row.payout_status);
        const dateText = this.escapeHtml(this.formatDate(row.paid_at || row.created_at));
        const amount = this.formatMoney(row.amount || 0);
        const methodText = row.payout_method ? this.escapeHtml(row.payout_method) : "Payout";
        const referenceText = row.payout_reference ? this.escapeHtml(row.payout_reference) : "";
        const notesText = row.notes ? this.escapeHtml(row.notes) : "";

        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
            '<div class="affiliate-data-row-main">' +
              "<span>" + dateText + "</span>" +
              "<strong>" + amount + "</strong>" +
            "</div>" +
            '<div class="affiliate-data-row-sub">' +
              '<span class="affiliate-status-badge ' + statusClass + '">' + statusLabel + "</span>" +
              '<span class="affiliate-data-note">' + methodText + (referenceText ? " · " + referenceText : "") + "</span>" +
              (notesText ? '<span class="affiliate-data-note">' + notesText + "</span>" : "") +
            "</div>" +
          "</div>"
        );
      })
      .join("");
  },

  renderClaims(rows) {
    const mount = document.getElementById("affiliateClaimsList");
    if (!mount) return;

    const summaryEl = document.getElementById("affiliateClaimsSummary");
    if (summaryEl) {
      if (!rows || !rows.length) {
        summaryEl.textContent = "No claim requests submitted yet.";
      } else {
        const pendingCount = rows.filter((row) => {
          const status = String(row.status || "").toLowerCase();
          return status === "pending" || status === "approved";
        }).length;

        summaryEl.textContent =
          pendingCount > 0
            ? "Pending and approved claim requests stay reserved until they are reviewed or paid."
            : "Your past and current claim requests are shown below.";
      }
    }

    if (!rows || !rows.length) {
      mount.innerHTML = '<div class="affiliate-empty-state">No claim requests yet.</div>';
      return;
    }

    mount.innerHTML = rows
      .map((row) => {
        const statusLabel = this.getClaimStatusLabel(row.status);
        const statusClass = this.getClaimStatusClass(row.status);
        const dateText = this.escapeHtml(this.formatDate(row.created_at));
        const amount = this.formatMoney(row.amount || 0);
        const noteText = row.message ? this.escapeHtml(row.message) : "";
        const payoutMethodText = row.payout_method ? this.escapeHtml(row.payout_method) : "";
        const payoutNetworkText = row.payout_network ? this.escapeHtml(row.payout_network) : "";
        const payoutAddressText = row.payout_address ? this.escapeHtml(row.payout_address) : "";
        const backupContactText =
          (row.backup_contact ? this.escapeHtml(row.backup_contact) : "") ||
          (row.payout_contact ? this.escapeHtml(row.payout_contact) : "");

        return (
          '<div class="affiliate-data-row affiliate-data-row--stacked">' +
            '<div class="affiliate-data-row-main">' +
              "<span>" + dateText + "</span>" +
              "<strong>" + amount + "</strong>" +
            "</div>" +
            '<div class="affiliate-data-row-sub">' +
              '<span class="affiliate-status-badge ' + statusClass + '">' + statusLabel + "</span>" +
              (noteText ? '<span class="affiliate-data-note">Note: ' + noteText + "</span>" : "") +
              (payoutMethodText ? '<span class="affiliate-data-note">Method: ' + payoutMethodText + "</span>" : "") +
              (payoutNetworkText ? '<span class="affiliate-data-note">Network: ' + payoutNetworkText + "</span>" : "") +
              (payoutAddressText ? '<span class="affiliate-data-note">Address: ' + payoutAddressText + "</span>" : "") +
              (backupContactText ? '<span class="affiliate-data-note">Backup: ' + backupContactText + "</span>" : "") +
            "</div>" +
          "</div>"
        );
      })
      .join("");
  },

  generateTrackingLink() {
    const pathEl = document.getElementById("affiliateTargetPath");
    const output = document.getElementById("affiliateGeneratedLink");
    const code = (this.affiliateProfile && this.affiliateProfile.referral_code) || "";

    const customPath = pathEl ? pathEl.value.trim() : "";

    if (!output || !code) return;

    const origin = window.location.origin;
    const siteRoot = window.location.pathname
      .replace("/affiliate-program/affiliate-program.html", "")
      .replace("affiliate-program/affiliate-program.html", "");
    const normalizedRoot = siteRoot.endsWith("/") ? siteRoot.slice(0, -1) : siteRoot;
    const normalizedPath = customPath
      ? (customPath.startsWith("/") ? customPath : "/" + customPath)
      : "/";

    output.value = origin + normalizedRoot + normalizedPath + "?ref=" + encodeURIComponent(code);
  },

  async submitClaimRequest(payload) {
    if (!window.axiomSupabase) {
      throw new Error("Supabase is not available.");
    }

    const affiliateId = this.getSafeAffiliateId();
    if (!affiliateId) {
      throw new Error("Affiliate profile not found.");
    }

    const amount = this.toNumber(payload && payload.amount, 0);
    const note = payload && payload.note ? String(payload.note).trim() : "";
    const payoutMethod = payload && payload.payoutMethod ? String(payload.payoutMethod).trim() : "";
    const payoutNetwork = payload && payload.payoutNetwork ? String(payload.payoutNetwork).trim() : "";
    const payoutAddress = payload && payload.payoutAddress ? String(payload.payoutAddress).trim() : "";
    const backupContact = payload && payload.backupContact ? String(payload.backupContact).trim() : "";

    if (!amount || amount <= 0) {
      throw new Error("Enter a valid claim amount.");
    }

    try {
      const rpcResponseExtended = await window.axiomSupabase.rpc("affiliate_submit_claim_request", {
        p_amount: amount,
        p_message: note || null,
        p_payout_method: payoutMethod || null,
        p_payout_network: payoutNetwork || null,
        p_payout_address: payoutAddress || null,
        p_backup_contact: backupContact || null
      });

      if (!rpcResponseExtended.error) {
        return true;
      }

      console.error("Extended claim RPC failed, trying base RPC:", rpcResponseExtended.error);
    } catch (error) {
      console.error("Extended claim RPC exception:", error);
    }

    try {
      const rpcResponseBase = await window.axiomSupabase.rpc("affiliate_submit_claim_request", {
        p_amount: amount,
        p_message: note || null
      });

      if (!rpcResponseBase.error) {
        try {
          const latestClaimResult = await window.axiomSupabase
            .from("affiliate_claim_requests")
            .select("id")
            .eq("affiliate_id", affiliateId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latestClaimResult.error && latestClaimResult.data && latestClaimResult.data.id) {
            await window.axiomSupabase
              .from("affiliate_claim_requests")
              .update({
                payout_method: payoutMethod || null,
                payout_network: payoutNetwork || null,
                payout_address: payoutAddress || null,
                backup_contact: backupContact || null,
                updated_at: new Date().toISOString()
              })
              .eq("id", latestClaimResult.data.id);
          }
        } catch (patchError) {
          console.error("Claim payout-info patch failed:", patchError);
        }

        return true;
      }

      console.error("Base claim RPC failed, trying direct insert:", rpcResponseBase.error);
    } catch (error) {
      console.error("Base claim RPC exception:", error);
    }

    try {
      const insertExtended = await window.axiomSupabase
        .from("affiliate_claim_requests")
        .insert({
          affiliate_id: affiliateId,
          amount: amount,
          message: note || null,
          discord_contact: this.getSafeDiscordContact() || null,
          payout_method: payoutMethod || null,
          payout_network: payoutNetwork || null,
          payout_address: payoutAddress || null,
          backup_contact: backupContact || null,
          status: "pending"
        });

      if (!insertExtended.error) {
        return true;
      }

      console.error("Extended direct insert failed, trying plain insert:", insertExtended.error);
    } catch (error) {
      console.error("Extended direct insert exception:", error);
    }

    const insertPlain = await window.axiomSupabase
      .from("affiliate_claim_requests")
      .insert({
        affiliate_id: affiliateId,
        amount: amount,
        message: note || null,
        discord_contact: this.getSafeDiscordContact() || null,
        status: "pending"
      });

    if (insertPlain.error) {
      throw insertPlain.error;
    }

    return true;
  },

  async submitClaim() {
    if (!this.affiliateProfile || !this.affiliateProfile.id) return;

    const amountInput = this.getClaimAmountInput();
    const noteInput = this.getClaimNoteInput();

    const amount = this.toNumber(amountInput ? amountInput.value : 0, 0);
    const note = noteInput ? noteInput.value.trim() : "";

    if (!amount || amount <= 0) {
      this.setMessage("Enter a valid claim amount.", "error");
      return;
    }

    const payoutValidationError = this.validateClaimPayoutDetails();
    if (payoutValidationError) {
      this.setMessage(payoutValidationError, "error");
      return;
    }

    try {
      this.setClaimButtonState("loading");

      const stats = await this.fetchStats();
      const maxClaimable = this.toNumber(stats.availableToClaim, 0);

      if (maxClaimable <= 0) {
        this.setMessage("You do not have any claimable balance available right now.", "error");
        return;
      }

      if (amount > maxClaimable) {
        this.setMessage(
          "You can only claim up to " + this.formatMoney(maxClaimable) + " right now.",
          "error"
        );
        if (amountInput) {
          amountInput.value = maxClaimable.toFixed(2);
        }
        return;
      }

      const payoutDetails = this.getClaimPayoutDetails();

      await this.submitClaimRequest({
        amount: amount,
        note: note,
        payoutMethod: payoutDetails.payoutMethod,
        payoutNetwork: payoutDetails.payoutNetwork,
        payoutAddress: payoutDetails.payoutAddress,
        backupContact: payoutDetails.backupContact
      });

      this.setMessage(
        "Claim request submitted successfully. It is now waiting in the admin dashboard for review.",
        "success"
      );

      if (amountInput) amountInput.value = "";
      if (noteInput) noteInput.value = "";
      if (this.getClaimPayoutMethodInput()) this.getClaimPayoutMethodInput().value = "";
      if (this.getClaimPayoutNetworkInput()) this.getClaimPayoutNetworkInput().value = "";
      if (this.getClaimPayoutAddressInput()) this.getClaimPayoutAddressInput().value = "";
      if (this.getClaimBackupContactInput()) this.getClaimBackupContactInput().value = "";

      await this.loadAffiliateProfile();
      await this.renderDashboard();
    } catch (error) {
      console.error(error);

      const rawMessage = String(error && error.message ? error.message : "Claim request failed.");
      let friendlyMessage = rawMessage;

      if (/only claim up to/i.test(rawMessage) || /exceeds available balance/i.test(rawMessage)) {
        friendlyMessage = "You can only submit up to your currently available claimable balance.";
      } else if (/not approved/i.test(rawMessage)) {
        friendlyMessage = "Your affiliate account must be approved before you can submit claims.";
      } else if (/signed in/i.test(rawMessage)) {
        friendlyMessage = "You must be signed in to submit a claim.";
      }

      this.setMessage(friendlyMessage, "error");
    } finally {
      const refreshedStats = await this.fetchStats();
      if (this.toNumber(refreshedStats.availableToClaim, 0) <= 0) {
        this.setClaimButtonState("disabled");
      } else {
        this.setClaimButtonState("ready");
      }
    }
  },

  async updateOwnReferralCode() {
    if (!window.axiomSupabase) {
      this.setReferralCodeStatus("Supabase is not available.", "error");
      return;
    }

    if (!this.currentUser || !this.currentUser.id) {
      this.setReferralCodeStatus("You must be signed in.", "error");
      return;
    }

    if (!this.affiliateProfile || !this.affiliateProfile.id) {
      this.setReferralCodeStatus("Affiliate profile not found.", "error");
      return;
    }

    const input = this.getReferralCodeInput();
    const saveBtn = this.getReferralCodeSaveButton();

    if (!input) {
      this.setReferralCodeStatus("Referral code input was not found.", "error");
      return;
    }

    const newCode = this.normalizeCode(input.value);
    const currentCode = this.normalizeCode(this.affiliateProfile.referral_code || "");

    if (!newCode) {
      this.setReferralCodeStatus("Enter a referral code.", "error");
      return;
    }

    if (newCode.length < 4) {
      this.setReferralCodeStatus("Code must be at least 4 characters.", "error");
      return;
    }

    if (newCode.length > 12) {
      this.setReferralCodeStatus("Code must be 12 characters or less.", "error");
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(newCode)) {
      this.setReferralCodeStatus("Use only letters, numbers, hyphens, and underscores.", "error");
      return;
    }

    if (newCode === currentCode) {
      this.setReferralCodeStatus("That is already your current code.", "error");
      return;
    }

    const originalButtonText = saveBtn ? saveBtn.textContent : "";

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }

      let rpcResult = null;
      let rpcError = null;

      const ownRpcResponse = await window.axiomSupabase.rpc("affiliate_update_own_referral_code", {
        p_new_referral_code: newCode
      });

      if (ownRpcResponse && !ownRpcResponse.error) {
        rpcResult = ownRpcResponse.data || null;
      } else {
        const fallbackResponse = await window.axiomSupabase.rpc("admin_update_affiliate_referral_code", {
          p_affiliate_id: this.affiliateProfile.id,
          p_new_referral_code: newCode
        });

        if (fallbackResponse.error) {
          rpcError = fallbackResponse.error;
        } else {
          rpcResult = fallbackResponse.data || null;
        }
      }

      if (rpcError) {
        throw rpcError;
      }

      await this.loadAffiliateProfile();

      const updatedCode = this.normalizeCode(
        (Array.isArray(rpcResult) && rpcResult[0] && rpcResult[0].referral_code) ||
          (rpcResult && rpcResult.referral_code) ||
          (this.affiliateProfile && this.affiliateProfile.referral_code) ||
          newCode
      );

      if (this.affiliateProfile) {
        this.affiliateProfile.referral_code = updatedCode;
      }

      this.syncReferralCodeUi(updatedCode);
      this.setReferralCodeStatus("Code updated successfully.", "success");
      this.setMessage("Referral / discount code updated successfully.", "success");
    } catch (error) {
      console.error(error);

      const rawMessage = String(error && error.message ? error.message : "Code update failed.");
      let friendlyMessage = rawMessage;

      if (/already taken/i.test(rawMessage)) {
        friendlyMessage = "Code already taken.";
      } else if (/duplicate/i.test(rawMessage)) {
        friendlyMessage = "Code already taken.";
      } else if (/12/i.test(rawMessage) && /character/i.test(rawMessage)) {
        friendlyMessage = "Code must be 12 characters or less.";
      } else if (/at least 4/i.test(rawMessage)) {
        friendlyMessage = "Code must be at least 4 characters.";
      }

      this.setReferralCodeStatus(friendlyMessage, "error");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalButtonText || "Save Code";
      }
    }
  },

  async copyValue(value, button) {
    if (!value) return;

    const original = button ? button.textContent : "";

    try {
      await navigator.clipboard.writeText(value);
      if (button) button.textContent = "Copied";
    } catch (error) {
      console.error(error);
      if (button) button.textContent = "Copy Failed";
    }

    if (button) {
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    }
  },

  generateReferralCode(name, email) {
    const source = (name + email).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const base = source.slice(0, 8) || "AXIOMAFF";
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return (base + suffix).slice(0, 12);
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

document.addEventListener("DOMContentLoaded", function () {
  if (
    window.AXIOM_AFFILIATE_DASHBOARD &&
    typeof window.AXIOM_AFFILIATE_DASHBOARD.init === "function"
  ) {
    window.AXIOM_AFFILIATE_DASHBOARD.init();
  } else {
    console.error("AXIOM_AFFILIATE_DASHBOARD.init is not available.");
  }
});
