document.addEventListener("DOMContentLoaded", async function () {
  const LOGIN_PATH = "login.html";

  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    window.location.href = LOGIN_PATH;
    return;
  }

  const supabase = window.axiomSupabase;
  let authHandled = false;

  function goToLogin() {
    const currentPath = window.location.pathname || "";
    if (!currentPath.endsWith("/login.html") && !currentPath.endsWith("login.html")) {
      window.location.href = LOGIN_PATH;
    }
  }

  async function signOutAndGoToLogin() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
    goToLogin();
  }

  async function getStableSession(maxAttempts = 10, delayMs = 250) {
    for (let i = 0; i < maxAttempts; i += 1) {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.error("getSession error:", error);
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
    if (!email) return null;

    const normalizedEmail = String(email).trim().toLowerCase();

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

  async function handleAuthenticatedSession(session) {
    if (authHandled) return true;

    const userEmail = String(session?.user?.email || "").trim().toLowerCase();

    if (!userEmail) {
      console.error("Authenticated user has no email.");
      await signOutAndGoToLogin();
      return false;
    }

    const adminEmailEl = document.getElementById("dashboardAdminEmail");
    if (adminEmailEl) {
      adminEmailEl.textContent = userEmail || "Admin";
    }

    let adminRow = null;

    try {
      adminRow = await getActiveAdminRow(userEmail);
    } catch (lookupError) {
      console.error("Admin lookup failed:", lookupError);
      if (adminEmailEl) {
        adminEmailEl.textContent = userEmail || "Admin";
      }
      return false;
    }

    if (!adminRow) {
      console.error("No active admin row found for:", userEmail);
      if (adminEmailEl) {
        adminEmailEl.textContent = userEmail || "Admin";
      }
      return false;
    }

    authHandled = true;

    window.AXIOM_ADMIN = {
      id: adminRow.id,
      email: adminRow.email,
      full_name: adminRow.full_name || "",
      is_active: adminRow.is_active === true
    };

    if (adminEmailEl) {
      adminEmailEl.textContent =
        adminRow.full_name?.trim() || adminRow.email || userEmail || "Admin";
    }

    const logoutBtn = document.getElementById("dashboardLogoutBtn");
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = "true";
      logoutBtn.addEventListener("click", async function () {
        try {
          await supabase.auth.signOut();
        } catch (logoutError) {
          console.error("Logout failed:", logoutError);
        }
        goToLogin();
      });
    }

    return true;
  }

  supabase.auth.onAuthStateChange(async function (event, session) {
    if (event === "SIGNED_OUT") {
      authHandled = false;
      goToLogin();
      return;
    }

    if (
      (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") &&
      session?.user
    ) {
      await handleAuthenticatedSession(session);
    }
  });

  try {
    const session = await getStableSession();

    if (!session?.user) {
      goToLogin();
      return;
    }

    await handleAuthenticatedSession(session);
  } catch (error) {
    console.error("Admin auth guard failed:", error);
    goToLogin();
  }
});
