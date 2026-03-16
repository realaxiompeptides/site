document.addEventListener("DOMContentLoaded", async function () {
  if (!window.axiomSupabase) {
    console.error("Supabase client missing.");
    window.location.href = "login.html";
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
      window.location.href = "login.html";
      return;
    }

    if (!session || !session.user) {
      window.location.href = "login.html";
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
      await supabase.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    if (!adminRow) {
      console.error("User is not an active admin.");
      await supabase.auth.signOut();
      window.location.href = "login.html";
      return;
    }

    const adminEmailEl = document.getElementById("dashboardAdminEmail");
    if (adminEmailEl) {
      adminEmailEl.textContent = userEmail || "Admin";
    }

    const logoutBtn = document.getElementById("dashboardLogoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        await supabase.auth.signOut();
        window.location.href = "login.html";
      });
    }

  } catch (error) {
    console.error("Admin auth guard failed:", error);
    window.location.href = "login.html";
  }
});
