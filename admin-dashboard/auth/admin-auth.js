document.addEventListener("DOMContentLoaded", async function () {
  const LOGIN_PATH = "login.html";

  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    window.location.href = LOGIN_PATH;
    return;
  }

  const supabase = window.axiomSupabase;

  function goToLogin() {
    const currentPath = window.location.pathname || "";
    if (!currentPath.endsWith("/login.html") && !currentPath.endsWith("login.html")) {
      window.location.href = LOGIN_PATH;
    }
  }

  async function getStableSession(maxAttempts = 12, delayMs = 250) {
    for (let i = 0; i < maxAttempts; i += 1) {
      try {
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
      } catch (error) {
        console.error("Session polling failed:", error);
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
      console.error("Admin lookup failed:", error);
      return null;
    }

    return data || null;
  }

  function setAdminLabel(value) {
    const adminEmailEl = document.getElementById("dashboardAdminEmail");
    if (adminEmailEl) {
      adminEmailEl.textContent = value || "Admin";
    }
  }

  async function bindLogout() {
    const logoutBtn = document.getElementById("dashboardLogoutBtn");
    if (!logoutBtn || logoutBtn.dataset.bound === "true") return;

    logoutBtn.dataset.bound = "true";
    logoutBtn.addEventListener("click", async function () {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Logout failed:", error);
      }
      goToLogin();
    });
  }

  async function hydrateAdmin() {
    const session = await getStableSession();

    if (!session?.user?.email) {
      goToLogin();
      return;
    }

    const userEmail = String(session.user.email || "").trim().toLowerCase();
    setAdminLabel(userEmail);
    await bindLogout();

    const adminRow = await getActiveAdminRow(userEmail);

    if (!adminRow) {
      console.error("No active admin row found for:", userEmail);
      goToLogin();
      return;
    }

    window.AXIOM_ADMIN = {
      id: adminRow.id,
      email: adminRow.email,
      full_name: adminRow.full_name || "",
      is_active: adminRow.is_active === true
    };

    setAdminLabel(adminRow.full_name?.trim() || adminRow.email || userEmail);
  }

  try {
    await hydrateAdmin();

    supabase.auth.onAuthStateChange(async function (event, session) {
      if (event === "SIGNED_OUT") {
        goToLogin();
        return;
      }

      if (
        (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") &&
        session?.user?.email
      ) {
        const userEmail = String(session.user.email || "").trim().toLowerCase();
        setAdminLabel(userEmail);
        await bindLogout();

        const adminRow = await getActiveAdminRow(userEmail);
        if (adminRow) {
          setAdminLabel(adminRow.full_name?.trim() || adminRow.email || userEmail);
        }
      }
    });
  } catch (error) {
    console.error("Admin auth guard failed:", error);
    goToLogin();
  }
});
