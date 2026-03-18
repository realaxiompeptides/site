document.addEventListener("DOMContentLoaded", async function () {
  const LOGIN_PATH = "/site/admin-dashboard/login.html";

  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    window.location.href = LOGIN_PATH;
    return;
  }

  const supabase = window.axiomSupabase;
  let authHandled = false;

  function goToLogin() {
    window.location.href = LOGIN_PATH;
  }

  async function signOutAndGoToLogin() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
    goToLogin();
  }

  async function getStableSession() {
    for (let i = 0; i < 8; i += 1) {
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

      await new Promise((resolve) => setTimeout(resolve, 250));
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
    if (authHandled) return;
    authHandled = true;

    const userEmail = String(session?.user?.email || "").trim().toLowerCase();

    if (!userEmail) {
      console.error("Authenticated user has no email.");
      await signOutAndGoToLogin();
      return;
    }

    let adminRow = null;

    try {
      adminRow = await getActiveAdminRow(userEmail);
    } catch (lookupError) {
      console.error("Admin lookup failed:", lookupError);
      await signOutAndGoToLogin();
      return;
    }

    if (!adminRow) {
      console.error("No active admin row found for:", userEmail);
      await signOutAndGoToLogin();
      return;
    }

    window.AXIOM_ADMIN = {
      id: adminRow.id,
      email: adminRow.email,
      full_name: adminRow.full_name || "",
      is_active: adminRow.is_active === true
    };

    const adminEmailEl = document.getElementById("dashboardAdminEmail");
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
  }

  supabase.auth.onAuthStateChange(async function (event, session) {
    if (event === "SIGNED_OUT") {
      goToLogin();
      return;
    }

    if ((event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
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
