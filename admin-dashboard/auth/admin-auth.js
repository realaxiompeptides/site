document.addEventListener("DOMContentLoaded", async function () {
  const LOGIN_PATH = "/site/admin-dashboard/login.html";

  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    window.location.href = LOGIN_PATH;
    return;
  }

  const supabase = window.axiomSupabase;

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Admin session check failed:", error);
      window.location.href = LOGIN_PATH;
      return;
    }

    if (!session || !session.user) {
      window.location.href = LOGIN_PATH;
      return;
    }

    const userEmail = session.user.email || "";

    const { data: adminRow, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", userEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (adminError) {
      console.error("Admin user lookup failed:", adminError);
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Sign out failed after admin lookup error:", signOutError);
      }
      window.location.href = LOGIN_PATH;
      return;
    }

    if (!adminRow) {
      console.error("User is not an active admin.");
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Sign out failed for inactive admin:", signOutError);
      }
      window.location.href = LOGIN_PATH;
      return;
    }

    const adminEmailEl = document.getElementById("dashboardAdminEmail");
    if (adminEmailEl) {
      adminEmailEl.textContent = userEmail || "Admin";
    }

    const logoutBtn = document.getElementById("dashboardLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        try {
          await supabase.auth.signOut();
        } catch (logoutError) {
          console.error("Logout failed:", logoutError);
        }
        window.location.href = LOGIN_PATH;
      });
    }
  } catch (error) {
    console.error("Admin auth guard failed:", error);
    window.location.href = LOGIN_PATH;
  }
});
