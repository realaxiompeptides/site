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

  function setMessage(message) {
    if (messageEl) {
      messageEl.textContent = message || "";
    }
  }

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session && session.user) {
      window.location.href = DASHBOARD_PATH;
      return;
    }
  } catch (error) {
    console.error("Initial login session check failed:", error);
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!email || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setMessage("Signing in...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Admin login failed:", error);
        setMessage(error.message || "Login failed.");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      window.location.href = DASHBOARD_PATH;
    } catch (error) {
      console.error("Unexpected login error:", error);
      setMessage("Something went wrong while signing in.");
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
