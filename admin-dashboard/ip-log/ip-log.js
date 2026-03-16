window.AXIOM_IP_LOG = {
  async load() {
    if (!window.axiomSupabase) return;

    const supabase = window.axiomSupabase;
    const mount = document.getElementById("visitorSessionsList");
    if (!mount) return;

    const { data, error } = await supabase
      .from("visitor_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Visitor sessions load failed:", error);
      mount.innerHTML = `<p class="dashboard-empty">Failed to load visitor sessions.</p>`;
      return;
    }

    if (!data || !data.length) {
      mount.innerHTML = `<p class="dashboard-empty">No visitor sessions found.</p>`;
      return;
    }

    mount.innerHTML = data.map(function (row) {
      return `
        <div class="dashboard-item-row">
          <div class="dashboard-item-info">
            <h4>${row.visitor_id || "Unknown visitor"}</h4>
            <p>Landing: ${row.landing_path || "—"}</p>
            <p>Referrer: ${row.referrer || "Direct"}</p>
            <p>Visits: ${Number(row.visit_count || 0)}</p>
          </div>
          <div class="dashboard-item-price">
            ${row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : "—"}
          </div>
        </div>
      `;
    }).join("");
  }
};
