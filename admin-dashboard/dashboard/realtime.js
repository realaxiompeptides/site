(function () {
  async function refreshAllFromRealtime() {
    if (
      window.AXIOM_DASHBOARD_INIT &&
      typeof window.AXIOM_DASHBOARD_INIT.refreshAllDashboardData === "function"
    ) {
      await window.AXIOM_DASHBOARD_INIT.refreshAllDashboardData();
    }
  }

  function subscribeDashboardRealtime() {
    const state = window.AXIOM_DASHBOARD_STATE;

    if (!window.axiomSupabase) {
      console.error("Supabase client missing for realtime subscription.");
      return;
    }

    if (state.dashboardRealtimeChannel) {
      try {
        window.axiomSupabase.removeChannel(state.dashboardRealtimeChannel);
      } catch (error) {
        console.error("Failed to remove previous realtime channel:", error);
      }
    }

    state.dashboardRealtimeChannel = window.axiomSupabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkout_sessions" },
        async function () {
          await refreshAllFromRealtime();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async function () {
          await refreshAllFromRealtime();
        }
      )
      .subscribe((status) => {
        console.log("Dashboard realtime status:", status);
      });
  }

  window.AXIOM_DASHBOARD_REALTIME = {
    subscribeDashboardRealtime
  };
})();
