document.addEventListener("DOMContentLoaded", async function () {
  const LOGIN_PATH = "/site/admin-dashboard/login.html";

  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    window.location.href = LOGIN_PATH;
    return;
  }

  const supabase = window.axiomSupabase;

  async function redirectToLogin() {
    window.location.href = LOGIN_PATH;
  }

  async function signOutAndRedirect() {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Sign out failed:", signOutError);
    }
    await redirectToLogin();
  }

  async function getActiveAdminRow(email) {
    if (!email) return null;

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, full_name, is_active")
      .eq("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin session check failed:", sessionError);
      await redirectToLogin();
      return;
    }

    if (!session || !session.user) {
      await redirectToLogin();
      return;
    }

    const userEmail = String(session.user.email || "").trim().toLowerCase();

    if (!userEmail) {
      console.error("Authenticated user has no email.");
      await signOutAndRedirect();
      return;
    }

    let adminRow = null;

    try {
      adminRow = await getActiveAdminRow(userEmail);
    } catch (adminLookupError) {
      console.error("Admin user lookup failed:", adminLookupError);
      await signOutAndRedirect();
      return;
    }

    if (!adminRow) {
      console.error("User is not an active admin:", userEmail);
      await signOutAndRedirect();
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
        await redirectToLogin();
      });
    }

    supabase.auth.onAuthStateChange(async function (event, newSession) {
      if (event === "SIGNED_OUT") {
        await redirectToLogin();
        return;
      }

      if (
        (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "SIGNED_IN") &&
        (!newSession || !newSession.user)
      ) {
        await redirectToLogin();
        return;
      }
    });
  } catch (error) {
    console.error("Admin auth guard failed:", error);
    await redirectToLogin();
  }
});
