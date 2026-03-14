(function () {
  const config = window.AXIOM_DASHBOARD_CONFIG || {};

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error("Missing Supabase config in dashboard-config.js");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase JS client not loaded.");
    return;
  }

  window.axiomSupabase = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
})();
