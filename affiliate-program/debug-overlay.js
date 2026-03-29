(function () {
  const PANEL_ID = "axiomDebugPanel";
  const BODY_ID = "axiomDebugBody";
  const COUNT_ID = "axiomDebugCount";
  const CLEAR_ID = "axiomDebugClear";
  const TOGGLE_ID = "axiomDebugToggle";

  let panel = null;
  let body = null;
  let countEl = null;
  let toggleBtn = null;
  let logs = [];
  let isVisible = false;
  let isAffiliateDebugAllowed = false;

  function getSupabase() {
    return window.axiomSupabase || window.AXIOM_SUPABASE || window.supabaseClient || null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatArgs(args) {
    return args
      .map((item) => {
        if (typeof item === "string") return item;
        try {
          return JSON.stringify(item, null, 2);
        } catch (_error) {
          return String(item);
        }
      })
      .join(" ");
  }

  function ensurePanel() {
    if (panel) return;

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position:fixed",
      "left:12px",
      "right:12px",
      "bottom:12px",
      "z-index:999999",
      "background:#06152f",
      "color:#fff",
      "border:1px solid rgba(255,255,255,0.14)",
      "border-radius:18px",
      "box-shadow:0 18px 48px rgba(0,0,0,0.4)",
      "overflow:hidden",
      "display:none",
      "max-height:55vh"
    ].join(";");

    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.12);">' +
        '<strong style="font-size:18px;">Axiom Debug</strong>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span id="' + COUNT_ID + '" style="opacity:.8;">0</span>' +
          '<button id="' + CLEAR_ID + '" type="button" style="border:0;background:#1d3566;color:#fff;padding:10px 14px;border-radius:14px;font-weight:700;">Clear</button>' +
          '<button id="' + TOGGLE_ID + '" type="button" style="border:0;background:#1d3566;color:#fff;padding:10px 14px;border-radius:14px;font-weight:700;">Hide</button>' +
        "</div>" +
      "</div>" +
      '<div id="' + BODY_ID + '" style="padding:0;overflow:auto;max-height:calc(55vh - 70px);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.45;"></div>';

    document.body.appendChild(panel);

    body = document.getElementById(BODY_ID);
    countEl = document.getElementById(COUNT_ID);
    toggleBtn = document.getElementById(TOGGLE_ID);

    document.getElementById(CLEAR_ID).addEventListener("click", function () {
      logs = [];
      renderLogs();
    });

    toggleBtn.addEventListener("click", function () {
      isVisible = !isVisible;
      renderVisibility();
    });
  }

  function renderLogs() {
    if (!body || !countEl) return;

    countEl.textContent = String(logs.length);

    body.innerHTML = logs
      .map(function (entry) {
        return (
          '<div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08);">' +
            '<div style="opacity:.75;margin-bottom:6px;">[' + escapeHtml(entry.time) + "] " + escapeHtml(entry.level) + "</div>" +
            '<div style="white-space:pre-wrap;word-break:break-word;">' + escapeHtml(entry.message) + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderVisibility() {
    if (!panel) return;
    panel.style.display = isAffiliateDebugAllowed && isVisible ? "block" : "none";
    if (toggleBtn) {
      toggleBtn.textContent = isVisible ? "Hide" : "Show";
    }
  }

  function hidePanelNow() {
    isAffiliateDebugAllowed = false;
    isVisible = false;
    if (panel) {
      panel.style.display = "none";
    }
  }

  function pushLog(level, args) {
    const message = formatArgs(args);

    logs.push({
      level: String(level || "LOG").toUpperCase(),
      time: new Date().toLocaleTimeString(),
      message: message
    });

    if (logs.length > 100) {
      logs.shift();
    }

    if (isAffiliateDebugAllowed) {
      ensurePanel();
      renderLogs();
      renderVisibility();
    }
  }

  async function userHasAffiliateProfile() {
    const supabase = getSupabase();
    if (!supabase || !supabase.auth) return false;

    try {
      const userResult = await supabase.auth.getUser();
      const user = userResult && userResult.data ? userResult.data.user : null;

      if (!user || !user.id) {
        return false;
      }

      const byAuth = await supabase
        .from("affiliates")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!byAuth.error && byAuth.data) {
        return true;
      }

      const email = user.email ? String(user.email).trim().toLowerCase() : "";
      if (!email) return false;

      const byEmail = await supabase
        .from("affiliates")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      return !byEmail.error && !!byEmail.data;
    } catch (_error) {
      return false;
    }
  }

  async function refreshVisibilityFromAuth() {
    const allowed = await userHasAffiliateProfile();

    if (!allowed) {
      hidePanelNow();
      return;
    }

    isAffiliateDebugAllowed = true;
    isVisible = true;
    ensurePanel();
    renderLogs();
    renderVisibility();
  }

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = function () {
    originalLog.apply(console, arguments);
    pushLog("log", Array.from(arguments));
  };

  console.warn = function () {
    originalWarn.apply(console, arguments);
    pushLog("warn", Array.from(arguments));
  };

  console.error = function () {
    originalError.apply(console, arguments);
    pushLog("error", Array.from(arguments));
  };

  window.addEventListener("error", function (event) {
    pushLog("error", [
      event.message || "Window error",
      event.filename || "",
      event.lineno ? "line " + event.lineno : "",
      event.colno ? "col " + event.colno : ""
    ]);
  });

  window.addEventListener("unhandledrejection", function (event) {
    pushLog("error", [event && event.reason ? event.reason : "Unhandled promise rejection"]);
  });

  document.addEventListener("DOMContentLoaded", function () {
    hidePanelNow();

    const supabase = getSupabase();
    if (!supabase || !supabase.auth) {
      return;
    }

    refreshVisibilityFromAuth();

    try {
      supabase.auth.onAuthStateChange(function (_event, session) {
        if (!session || !session.user) {
          hidePanelNow();
          return;
        }
        refreshVisibilityFromAuth();
      });
    } catch (_error) {
      hidePanelNow();
    }
  });
})();
