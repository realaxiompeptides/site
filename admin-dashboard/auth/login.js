document.addEventListener("DOMContentLoaded", async function () {
  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    return;
  }

  const supabase = window.axiomSupabase;
  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("adminLoginEmail");
  const passwordInput = document.getElementById("adminLoginPassword");
  const submitBtn = document.getElementById("adminLoginSubmit");
  const messageEl = document.getElementById("adminLoginMessage");

  const LOGIN_PATH = "/site/admin-dashboard/login.html";
  const DASHBOARD_PATH = "/site/admin-dashboard/index.html";

  let isSubmitting = false;

  function setMessage(message, isError = false) {
    if (!messageEl) return;
    messageEl.textContent = message || "";
    messageEl.classList.toggle("is-error", Boolean(isError));
    messageEl.classList.toggle("is-success", !isError && Boolean(message));
  }

  function setSubmittingState(submitting) {
    isSubmitting = submitting;
    if (submitBtn) {
      submitBtn.disabled = submitting;
      submitBtn.textContent = submitting ? "Signing In..." : "Sign In";
    }
  }

  async function getStableSession(maxAttempts = 8, delayMs = 250) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Stable session check failed:", error);
        return null;
      }

      if (session?.user) {
        return session;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return null;
  }

  async function getActiveAdminRow(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return null;

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, full_name, is_active")
      .ilike("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  async function redirectIfAlreadySignedIn() {
    try {
      const session = await getStableSession(2, 150);
      if (!session?.user?.email) return false;

      const adminRow = await getActiveAdminRow(session.user.email);
      if (!adminRow) {
        await supabase.auth.signOut();
        return false;
      }

      window.location.href = DASHBOARD_PATH;
      return true;
    } catch (error) {
      console.error("Initial login session check failed:", error);
      return false;
    }
  }

  try {
    const redirected = await redirectIfAlreadySignedIn();
    if (redirected) return;
  } catch (error) {
    console.error("Initial redirect check failed:", error);
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    const email = String(emailInput?.value || "").trim().toLowerCase();
    const password = passwordInput?.value || "";

    if (!email || !password) {
      setMessage("Enter your email and password.", true);
      return;
    }

    setSubmittingState(true);
    setMessage("Signing in...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Admin login failed:", error);
        setMessage(error.message || "Login failed.", true);
        setSubmittingState(false);
        return;
      }

      const session = data?.session?.user ? data.session : await getStableSession();

      if (!session?.user?.email) {
        setMessage("Login succeeded but no session was created.", true);
        setSubmittingState(false);
        return;
      }

      const adminRow = await getActiveAdminRow(session.user.email);

      if (!adminRow) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Sign out failed after inactive admin check:", signOutError);
        }

        setMessage("This account is not an active admin.", true);
        setSubmittingState(false);
        return;
      }

      setMessage("Login successful. Redirecting...");
      window.location.href = DASHBOARD_PATH;
    } catch (error) {
      console.error("Unexpected login error:", error);
      setMessage(error.message || "Something went wrong while signing in.", true);
      setSubmittingState(false);
    }
  });

  supabase.auth.onAuthStateChange(async function (event, session) {
    if (
      window.location.pathname === LOGIN_PATH &&
      (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") &&
      session?.user?.email
    ) {
      try {
        const adminRow = await getActiveAdminRow(session.user.email);
        if (adminRow) {
          window.location.href = DASHBOARD_PATH;
        }
      } catch (error) {
        console.error("Auth state redirect failed:", error);
      }
    }
  });
});
