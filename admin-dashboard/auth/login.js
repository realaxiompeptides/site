document.addEventListener("DOMContentLoaded", async function () {
  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    return;
  }

  const supabase = window.axiomSupabase;

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session && session.user) {
      window.location.href = "index.html";
      return;
    }
  } catch (error) {
    console.error("Initial session check failed:", error);
  }

  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("adminLoginEmail");
  const passwordInput = document.getElementById("adminLoginPassword");
  const messageEl = document.getElementById("adminLoginMessage");
  const submitBtn = document.getElementById("adminLoginSubmit");

  if (!form) return;

  function setMessage(message) {
    if (messageEl) {
      messageEl.textContent = message || "";
    }
  }

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
        email: email,
        password: password
      });

      if (error) {
        console.error("Admin login failed:", error);
        setMessage(error.message || "Login failed.");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      window.location.href = "index.html";
    } catch (error) {
      console.error("Unexpected login error:", error);
      setMessage("Something went wrong while signing in.");
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
