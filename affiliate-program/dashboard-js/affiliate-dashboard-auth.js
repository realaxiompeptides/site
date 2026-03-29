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
    if (!this.authEventsBound) {
      this.authEventsBound = true;

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
    }

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

  showAuth() {
    this.showGuestView();

    if (this.authCard) {
      this.authCard.hidden = false;
      this.authCard.style.display = "";
    }

    this.showLogin();
  },

  async showDashboard() {
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
      const session =
        sessionResult && sessionResult.data ? sessionResult.data.session || null : null;

      const userResult = await supabase.auth.getUser();
      const user = userResult && userResult.data ? userResult.data.user || null : null;

      this.currentUser = user || (session ? session.user : null);

      if (!this.currentUser) {
        this.showAuth();
        return;
      }

      await this.loadAffiliateProfile();

      if (!this.affiliateProfile) {
        this.showAuth();
        this.setMessage(
          "Affiliate profile not found. Please sign up for the affiliate program.",
          "error"
        );
        this.showSignup();
        return;
      }

      if (String(this.affiliateProfile.status || "").toLowerCase() !== "approved") {
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
      console.error(
        "[Affiliate Dashboard] Restore session failed:",
        error?.message || error,
        error?.stack || ""
      );
      this.showAuth();
      this.setMessage("Could not restore your affiliate session.", "error");
    }
  },

  async signIn() {
    const supabase = this.getSupabase();
    const emailEl = document.getElementById("affiliateLoginEmail");
    const passwordEl = document.getElementById("affiliateLoginPassword");

    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";

    if (!supabase || !supabase.auth) {
      this.setMessage("Supabase auth is not available.", "error");
      return;
    }

    if (!email || !password) {
      this.setMessage("Enter your email and password.", "error");
      return;
    }

    try {
      const result = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) throw result.error;

      this.currentUser = result.data ? result.data.user || null : null;

      await this.loadAffiliateProfile();

      if (!this.affiliateProfile) {
        this.showAuth();
        this.setMessage(
          "Affiliate profile not found. Please create an affiliate account first.",
          "error"
        );
        this.showSignup();
        return;
      }

      if (String(this.affiliateProfile.status || "").toLowerCase() !== "approved") {
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
      console.error(
        "[Affiliate Dashboard] Sign in failed:",
        error?.message || error,
        error?.stack || ""
      );
      this.setMessage(error?.message || "Sign in failed.", "error");
    }
  },

  async generateUniqueReferralCode(name, email) {
    const supabase = this.getSupabase();
    const baseSeed =
      (name + email).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "AXIOMAFFILIATE";
    const base = baseSeed.slice(0, 8) || "AXIOMAFF";

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const candidate = this.normalizeCode((base + suffix).slice(0, 12));

      if (!supabase) {
        return candidate;
      }

      try {
        const existing = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", candidate)
          .maybeSingle();

        if (!existing.error && !existing.data) {
          return candidate;
        }
      } catch (error) {
        console.error("[Affiliate Dashboard] Referral code uniqueness check failed:", error);
      }
    }

    return this.normalizeCode((base + Date.now().toString().slice(-4)).slice(0, 12));
  },

  async signUp() {
    const supabase = this.getSupabase();

    const nameEl = document.getElementById("affiliateSignupName");
    const emailEl = document.getElementById("affiliateSignupEmail");
    const passwordEl = document.getElementById("affiliateSignupPassword");
    const discordEl = document.getElementById("affiliateSignupDiscord");

    const name = nameEl ? nameEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";
    const discord = discordEl ? discordEl.value.trim() : "";

    if (!supabase || !supabase.auth) {
      this.setMessage("Supabase auth is not available.", "error");
      return;
    }

    if (!name || !email || !password) {
      this.setMessage("Complete all required fields.", "error");
      return;
    }

    try {
      const result = await supabase.auth.signUp({
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
      const referralCode = await this.generateUniqueReferralCode(name, email);

      if (userId) {
        const existingResult = await supabase
          .from("affiliates")
          .select("id, auth_user_id")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (existingResult.error) throw existingResult.error;

        if (existingResult.data && existingResult.data.id) {
          const updateResult = await supabase
            .from("affiliates")
            .update({
              email: email,
              full_name: name,
              discord_username: discord || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingResult.data.id);

          if (updateResult.error) throw updateResult.error;
        } else {
          const insertResult = await supabase
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
      console.error(
        "[Affiliate Dashboard] Sign up failed:",
        error?.message || error,
        error?.stack || ""
      );
      this.setMessage(error?.message || "Sign up failed.", "error");
    }
  },

  async signOut() {
    const supabase = this.getSupabase();

    try {
      if (supabase && supabase.auth) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("[Affiliate Dashboard] Sign out failed:", error);
    }

    this.currentUser = null;
    this.affiliateProfile = null;
    this.affiliateProfileIds = [];
    this.showAuth();
    this.setMessage("");
    this.setReferralCodeStatus("", "");
  }
});
