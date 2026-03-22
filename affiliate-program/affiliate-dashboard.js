window.AXIOM_AFFILIATE_DASHBOARD = {
  currentUser: null,
  affiliateProfile: null,

  async init() {
    await this.loadDashboardPartials();
    this.cacheDom();
    this.bindAuthEvents();
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
          if (!response.ok) throw new Error(`Failed to load ${item.file}`);
          mount.innerHTML = await response.text();
        } catch (error) {
          console.error(error);
        }
      })
    );
  },

  cacheDom() {
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
  },

  setMessage(message, type = "success") {
    if (!this.messageEl) return;

    this.messageEl.textContent = message || "";
    this.messageEl.classList.remove("is-active", "success", "error");

    if (message) {
      this.messageEl.classList.add("is-active", type);
    }
  },

  bindAuthEvents() {
    if (this.loginTab) {
      this.loginTab.addEventListener("click", () => this.showLogin());
    }

    if (this.signupTab) {
      this.signupTab.addEventListener("click", () => this.showSignup());
    }

    if (this.loginForm) {
      this.loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.signIn();
      });
    }

    if (this.signupForm) {
      this.signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.signUp();
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", async () => {
        await this.signOut();
      });
    }

    document.addEventListener("click", (event) => {
      const generateBtn = event.target.closest("#generateAffiliateLinkBtn");
      const copyBtn = event.target.closest("[data-affiliate-copy]");
      const claimBtn = event.target.closest("#submitAffiliateClaimBtn");

      if (generateBtn) {
        event.preventDefault();
        this.generateTrackingLink();
      }

      if (copyBtn) {
        event.preventDefault();
        this.copyValue(copyBtn.getAttribute("data-affiliate-copy") || "", copyBtn);
      }

      if (claimBtn) {
        event.preventDefault();
        this.submitClaim();
      }
    });
  },

  showLogin() {
    if (this.loginTab) this.loginTab.classList.add("is-active");
    if (this.signupTab) this.signupTab.classList.remove("is-active");
    if (this.loginForm) this.loginForm.hidden = false;
    if (this.signupForm) this.signupForm.hidden = true;
  },

  showSignup() {
    if (this.signupTab) this.signupTab.classList.add("is-active");
    if (this.loginTab) this.loginTab.classList.remove("is-active");
    if (this.signupForm) this.signupForm.hidden = false;
    if (this.loginForm) this.loginForm.hidden = true;
  },

  async restoreSessionAndRender() {
    if (!window.axiomSupabase || !window.axiomSupabase.auth) {
      this.setMessage("Supabase auth is not available.", "error");
      return;
    }

    try {
      const result = await window.axiomSupabase.auth.getUser();
      const user = result?.data?.user || null;
      this.currentUser = user;

      if (user) {
        await this.loadAffiliateProfile();
        this.showDashboard();
      } else {
        this.showAuth();
      }
    } catch (error) {
      console.error(error);
      this.showAuth();
    }
  },

  async signIn() {
    const email = document.getElementById("affiliateLoginEmail")?.value.trim() || "";
    const password = document.getElementById("affiliateLoginPassword")?.value || "";

    if (!email || !password) {
      this.setMessage("Enter your email and password.", "error");
      return;
    }

    try {
      const { data, error } = await window.axiomSupabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentUser = data?.user || null;
      await this.loadAffiliateProfile();
      this.showDashboard();
      this.setMessage("");
    } catch (error) {
      console.error(error);
      this.setMessage(error.message || "Sign in failed.", "error");
    }
  },

  async signUp() {
    const name = document.getElementById("affiliateSignupName")?.value.trim() || "";
    const email = document.getElementById("affiliateSignupEmail")?.value.trim() || "";
    const password = document.getElementById("affiliateSignupPassword")?.value || "";
    const discord = document.getElementById("affiliateSignupDiscord")?.value.trim() || "";

    if (!name || !email || !password) {
      this.setMessage("Complete all required fields.", "error");
      return;
    }

    try {
      const { data, error } = await window.axiomSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (error) throw error;

      const userId = data?.user?.id || null;
      const referralCode = this.generateReferralCode(name, email);

      if (userId) {
        const { error: profileError } = await window.axiomSupabase
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

        if (profileError) throw profileError;
      }

      this.setMessage("Affiliate application submitted. Sign in after your account is approved.");
      this.showLogin();
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
  },

  async loadAffiliateProfile() {
    if (!this.currentUser?.id) return;

    try {
      const { data, error } = await window.axiomSupabase
        .from("affiliates")
        .select("*")
        .eq("auth_user_id", this.currentUser.id)
        .maybeSingle();

      if (error) throw error;
      this.affiliateProfile = data || null;
    } catch (error) {
      console.error(error);
      this.affiliateProfile = null;
    }
  },

  showAuth() {
    if (this.authCard) this.authCard.hidden = false;
    if (this.dashboardWrap) this.dashboardWrap.hidden = true;
  },

  async showDashboard() {
    if (this.authCard) this.authCard.hidden = true;
    if (this.dashboardWrap) this.dashboardWrap.hidden = false;

    await this.renderDashboard();
  },

  async renderDashboard() {
    const profile = this.affiliateProfile;
    const email = this.currentUser?.email || "—";

    this.setText("affiliateDashboardEmail", email);
    this.setText("affiliateDashboardStatus", profile?.status || "pending");
    this.setText("affiliateDashboardCode", profile?.referral_code || "—");
    this.setText(
      "affiliateDashboardCommissionRate",
      profile ? `${Number(profile.commission_value || 0)}%` : "—"
    );
    this.setText(
      "affiliateDashboardDiscountRate",
      profile ? `${Number(profile.discount_value || 0)}%` : "—"
    );

    const stats = await this.fetchStats();
    this.setText("affiliateClicksCount", String(stats.clicks));
    this.setText("affiliateConversionsCount", String(stats.conversions));
    this.setText("affiliateClaimableAmount", this.formatMoney(stats.claimable));
    this.setText("affiliatePaidAmount", this.formatMoney(stats.paid));

    const baseUrl = `${window.location.origin}${window.location.pathname.replace("affiliate-program/affiliate-program.html", "")}`;
    const code = profile?.referral_code || "";
    const defaultLink = code ? `${baseUrl}?ref=${encodeURIComponent(code)}` : "";

    const generatedLinkInput = document.getElementById("affiliateGeneratedLink");
    if (generatedLinkInput && !generatedLinkInput.value) {
      generatedLinkInput.value = defaultLink;
    }

    this.renderRecentCommissions(stats.recentCommissions);
    this.renderPayouts(stats.payouts);
  },

  async fetchStats() {
    if (!this.affiliateProfile?.id) {
      return {
        clicks: 0,
        conversions: 0,
        claimable: 0,
        paid: 0,
        recentCommissions: [],
        payouts: []
      };
    }

    try {
      const affiliateId = this.affiliateProfile.id;

      const [{ count: clicks }, { data: conversions }, { data: payouts }] = await Promise.all([
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
          .order("created_at", { ascending: false })
      ]);

      const conversionRows = Array.isArray(conversions) ? conversions : [];
      const payoutRows = Array.isArray(payouts) ? payouts : [];

      const claimable = conversionRows
        .filter((item) => item.commission_status === "claimable")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

      const paid = payoutRows
        .filter((item) => item.payout_status === "paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        clicks: Number(clicks || 0),
        conversions: conversionRows.length,
        claimable,
        paid,
        recentCommissions: conversionRows.slice(0, 6),
        payouts: payoutRows.slice(0, 6)
      };
    } catch (error) {
      console.error(error);
      return {
        clicks: 0,
        conversions: 0,
        claimable: 0,
        paid: 0,
        recentCommissions: [],
        payouts: []
      };
    }
  },

  renderRecentCommissions(rows) {
    const mount = document.getElementById("affiliateRecentCommissionsList");
    if (!mount) return;

    if (!rows.length) {
      mount.innerHTML = `<div class="affiliate-empty-state">No commissions yet.</div>`;
      return;
    }

    mount.innerHTML = rows.map((row) => {
      return `
        <div class="affiliate-data-row">
          <span>Order #${row.order_number || "—"} · ${row.commission_status || "pending"}</span>
          <strong>${this.formatMoney(row.commission_amount || 0)}</strong>
        </div>
      `;
    }).join("");
  },

  renderPayouts(rows) {
    const mount = document.getElementById("affiliatePayoutsList");
    if (!mount) return;

    if (!rows.length) {
      mount.innerHTML = `<div class="affiliate-empty-state">No payouts yet.</div>`;
      return;
    }

    mount.innerHTML = rows.map((row) => {
      return `
        <div class="affiliate-data-row">
          <span>${row.payout_status || "pending"} · ${this.formatDate(row.created_at)}</span>
          <strong>${this.formatMoney(row.amount || 0)}</strong>
        </div>
      `;
    }).join("");
  },

  generateTrackingLink() {
    const customPath = document.getElementById("affiliateTargetPath")?.value.trim() || "";
    const output = document.getElementById("affiliateGeneratedLink");
    const code = this.affiliateProfile?.referral_code || "";

    if (!output || !code) return;

    const origin = window.location.origin;
    const siteRoot = window.location.pathname.replace("/affiliate-program/affiliate-program.html", "").replace("affiliate-program/affiliate-program.html", "");
    const normalizedPath = customPath
      ? (customPath.startsWith("/") ? customPath : `/${customPath}`)
      : "/";

    output.value = `${origin}${siteRoot}${normalizedPath}?ref=${encodeURIComponent(code)}`;
  },

  async submitClaim() {
    if (!this.affiliateProfile?.id) return;

    const amountInput = document.getElementById("affiliateClaimAmount");
    const noteInput = document.getElementById("affiliateClaimNote");
    const amount = Number(amountInput?.value || 0);
    const note = noteInput?.value.trim() || "";

    if (!amount || amount <= 0) {
      this.setMessage("Enter a valid claim amount.", "error");
      return;
    }

    try {
      const { error } = await window.axiomSupabase
        .from("affiliate_claim_requests")
        .insert({
          affiliate_id: this.affiliateProfile.id,
          amount: amount,
          message: note || null,
          discord_contact: this.affiliateProfile.discord_username || null,
          status: "pending"
        });

      if (error) throw error;

      this.setMessage("Claim request submitted. Message us on Discord to complete payout.");
      if (amountInput) amountInput.value = "";
      if (noteInput) noteInput.value = "";
    } catch (error) {
      console.error(error);
      this.setMessage(error.message || "Claim request failed.", "error");
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
    const source = `${name}${email}`.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const base = source.slice(0, 8) || "AXIOMAFF";
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${base}${suffix}`;
  },

  formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
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
