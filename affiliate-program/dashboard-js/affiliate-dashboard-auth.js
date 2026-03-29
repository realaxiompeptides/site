Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  bindSupabaseAuthListener() {
    const supabase = this.getSupabase();

    if (!supabase || !supabase.auth || this.authSubscription) {
      return;
    }

    try {
      const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
        this.currentUser = session && session.user ? session.user : null;

        if (!this.currentUser) {
          this.affiliateProfile = null;
          this.affiliateProfileIds = [];
          this.showAuth();
          this.setMessage("");
          this.setReferralCodeStatus("", "");
          return;
        }

        try {
          await this.restoreSessionAndRender();
        } catch (error) {
          console.error(
            "[Affiliate Dashboard] Auth state restore failed:",
            error?.message || error,
            error?.stack || ""
          );
        }
      });

      this.authSubscription =
        authListener && authListener.data && authListener.data.subscription
          ? authListener.data.subscription
          : null;
    } catch (error) {
      console.error(
        "[Affiliate Dashboard] Failed to bind auth listener:",
        error?.message || error,
        error?.stack || ""
      );
    }
  },

  bindAuthEvents() {
    this.refreshDomReferences();

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

    this.authEventsBound = true;

    if (!this.delegatedEventsBound) {
      this.delegatedEventsBound = true;

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
        const refreshBtn = event.target.closest("#affiliateRefreshDashboardBtn");

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

        if (refreshBtn) {
          event.preventDefault();
          this.renderDashboard();
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
    this.refreshDomReferences();

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
    this.refreshDomReferences();

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

  showAuth() {
    this.refreshDomReferences();
    this.showGuestView();

    if (this.authCard) {
      this.authCard.hidden = false;
      this.authCard.style.display = "";
    }

    this.showLogin();
  },

  async showDashboard() {
    this.refreshDomReferences();
    this.showApprovedDashboardView();

    if (this.authCard) {
      this.authCard.hidden = true;
      this.authCard.style.display = "none";
    }

    if (typeof this.renderDashboard !== "function") {
      throw new Error("renderDashboard is not defined.");
    }

    console.log("[Affiliate Dashboard] Calling renderDashboard...");
    await this.renderDashboard();
    console.log("[Affiliate Dashboard] renderDashboard finished.");
  },

  async restoreSessionAndRender() {
    const supabase = this.getSupabase();

    if (!supabase || !supabase.auth) {
      this.setMessage("Supabase auth is not available.", "error");
      this.showAuth();
      return;
    }

    try {
      const sessionResult = await supabase.auth.getSession();
      this.currentUser =
        sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user
          ? sessionResult.data.session.user
          : null;
    } catch (error) {
      console.error("[Affiliate Dashboard] Failed getting session:", error);
      this.currentUser = null;
    }

    if (!this.currentUser) {
      this.affiliateProfile = null;
      this.affiliateProfileIds = [];
      this.showAuth();
      return;
    }

    await this.loadAffiliateProfile();

    if (!this.affiliateProfile) {
      this.showAuth();
      this.showSignup();
      this.setMessage(
        "Your account is signed in, but no affiliate profile was found yet. Submit the sign-up form or contact support if you already applied.",
        "error"
      );
      return;
    }

    await this.showDashboard();
  }
});
