Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
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

    if (!this._delegatedBound) {
      this._delegatedBound = true;

      document.addEventListener("click", (event) => {
        const generateBtn = event.target.closest("#generateAffiliateLinkBtn");
        const copyBtn = event.target.closest("[data-affiliate-copy]");
        const claimBtn = event.target.closest("#submitAffiliateClaimBtn");
        const saveCodeBtn = event.target.closest("#affiliateSaveReferralCodeBtn");
        const copyCodeBtn = event.target.closest("#affiliateCopyReferralCodeBtn");

        if (generateBtn) {
          event.preventDefault();
          this.generateTrackingLink();
          return;
        }

        if (copyBtn) {
          event.preventDefault();
          const value = copyBtn.getAttribute("data-affiliate-copy") || "";
          this.copyValue(value, copyBtn);
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
          this.copyValue(
            (this.affiliateProfile && this.affiliateProfile.referral_code) || "",
            copyCodeBtn
          );
        }
      });

      document.addEventListener("input", (event) => {
        const target = event.target;

        if (target && target.id === "affiliateReferralCodeInput") {
          const normalized = this.normalizeCode(target.value);
          if (normalized !== target.value) {
            target.value = normalized;
          }
          this.setReferralCodeStatus("", "");
        }

        if (target && target.id === "affiliateTargetPath") {
          this.generateTrackingLink();
        }

        if (target && target.id === "affiliateClaimPayoutMethod") {
          this.updateClaimPayoutFieldVisibility();
        }
      });
    }
  },

  bindSupabaseAuthListener() {
    const supabase = this.getSupabase();
    if (!supabase || !supabase.auth || this._authSubscriptionBound) {
      return;
    }

    const listener = supabase.auth.onAuthStateChange(async (_event, session) => {
      this.currentUser = session && session.user ? session.user : null;

      if (!this.currentUser) {
        this.affiliateProfile = null;
        this.showAuth();
        return;
      }

      await this.restoreSessionAndRender();
    });

    this._authSubscriptionBound = true;
    this.authSubscription =
      listener && listener.data && listener.data.subscription
        ? listener.data.subscription
        : null;
  },

  showLogin() {
    this.refreshDomReferences();

    if (this.loginTab) this.loginTab.classList.add("is-active");
    if (this.signupTab) this.signupTab.classList.remove("is-active");

    if (this.loginForm) {
      this.loginForm.hidden = false;
      this.loginForm.style.display = "";
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
      this.signupForm.style.display = "";
    }

    if (this.loginForm) {
      this.loginForm.hidden = true;
      this.loginForm.style.display = "none";
    }
  },

  showAuth() {
    this.refreshDomReferences();
    this.hideDashboardSections();
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
    this.showDashboardSections();

    if (this.authCard) {
      this.authCard.hidden = true;
      this.authCard.style.display = "none";
    }

    await this.renderDashboard();
  },

  async restoreSessionAndRender() {
    const supabase = this.getSupabase();

    if (!supabase || !supabase.auth) {
      this.showAuth();
      this.setMessage("Supabase auth is not available.", "error");
      return;
    }

    const sessionResult = await supabase.auth.getSession();
    this.currentUser =
      sessionResult &&
      sessionResult.data &&
      sessionResult.data.session &&
      sessionResult.data.session.user
        ? sessionResult.data.session.user
        : null;

    if (!this.currentUser) {
      this.affiliateProfile = null;
      this.showAuth();
      return;
    }

    await this.loadAffiliateProfile();

    if (!this.affiliateProfile) {
      this.showAuth();
      this.showSignup();
      this.setMessage(
        "Your account is signed in, but no affiliate profile was found. Submit the sign-up form or contact support.",
        "error"
      );
      return;
    }

    const status = String(this.affiliateProfile.status || "").trim().toLowerCase();

    if (status === "pending") {
      this.hideDashboardSections();
      this.showPendingView();
      return;
    }

    if (status === "rejected") {
      this.hideDashboardSections();
      this.showRejectedView();
      return;
    }

    if (status === "suspended") {
      this.hideDashboardSections();
      this.showSuspendedView();
      return;
    }

    await this.showDashboard();
  },

  async signIn() {
    const supabase = this.getSupabase();
    if (!supabase || !supabase.auth || !this.loginForm) {
      this.setMessage("Sign in is temporarily unavailable.", "error");
      return;
    }

    const emailEl =
      document.getElementById("affiliateLoginEmail") ||
      this.loginForm.querySelector("#affiliateLoginEmail") ||
      this.loginForm.querySelector('input[name="email"]');

    const passwordEl =
      document.getElementById("affiliateLoginPassword") ||
      this.loginForm.querySelector("#affiliateLoginPassword") ||
      this.loginForm.querySelector('input[name="password"]');

    const email = emailEl ? String(emailEl.value || "").trim() : "";
    const password = passwordEl ? String(passwordEl.value || "") : "";

    if (!email || !password) {
      this.setMessage("Enter your email and password.", "error");
      return;
    }

    this.setMessage("Signing in...", "");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      this.setMessage(error.message || "Unable to sign in.", "error");
      return;
    }

    this.setMessage("", "");
    await this.restoreSessionAndRender();
  },

  async signUp() {
    const supabase = this.getSupabase();
    if (!supabase || !supabase.auth || !this.signupForm) {
      this.setMessage("Sign up is temporarily unavailable.", "error");
      return;
    }

    const nameEl =
      document.getElementById("affiliateSignupName") ||
      this.signupForm.querySelector("#affiliateSignupName") ||
      this.signupForm.querySelector('input[name="full_name"]');

    const emailEl =
      document.getElementById("affiliateSignupEmail") ||
      this.signupForm.querySelector("#affiliateSignupEmail") ||
      this.signupForm.querySelector('input[name="email"]');

    const passwordEl =
      document.getElementById("affiliateSignupPassword") ||
      this.signupForm.querySelector("#affiliateSignupPassword") ||
      this.signupForm.querySelector('input[name="password"]');

    const discordEl =
      document.getElementById("affiliateSignupDiscord") ||
      this.signupForm.querySelector("#affiliateSignupDiscord") ||
      this.signupForm.querySelector('input[name="discord_username"]');

    const fullName = nameEl ? String(nameEl.value || "").trim() : "";
    const email = emailEl ? String(emailEl.value || "").trim() : "";
    const password = passwordEl ? String(passwordEl.value || "") : "";
    const discordUsername = discordEl ? String(discordEl.value || "").trim() : "";

    if (!fullName || !email || !password) {
      this.setMessage("Complete all required sign-up fields.", "error");
      return;
    }

    this.setMessage("Creating your account...", "");

    const authResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authResult.error) {
      this.setMessage(authResult.error.message || "Unable to sign up.", "error");
      return;
    }

    const user =
      authResult &&
      authResult.data &&
      authResult.data.user
        ? authResult.data.user
        : null;

    try {
      const insertPayload = {
        auth_user_id: user && user.id ? user.id : null,
        email: email.toLowerCase(),
        full_name: fullName,
        discord_username: discordUsername || null,
        status: "pending"
      };

      const { error: insertError } = await supabase.from("affiliates").insert(insertPayload);

      if (insertError) {
        console.error("[Affiliate Dashboard] Affiliate insert failed:", insertError);
      }
    } catch (error) {
      console.error("[Affiliate Dashboard] Affiliate insert exception:", error);
    }

    this.setMessage(
      "Your affiliate account was created. If email confirmation is enabled, confirm your email before signing in.",
      ""
    );

    this.showLogin();
  },

  async signOut() {
    const supabase = this.getSupabase();
    if (!supabase || !supabase.auth) {
      this.showAuth();
      return;
    }

    await supabase.auth.signOut();
    this.currentUser = null;
    this.affiliateProfile = null;
    this.showAuth();
  }
});
