(function () {
  if (window.AXIOM_DEBUG_OVERLAY_LOADED) return;
  window.AXIOM_DEBUG_OVERLAY_LOADED = true;

  const logs = [];
  const MAX_LOGS = 100;

  function formatValue(value) {
    if (value instanceof Error) {
      return value.stack || value.message || String(value);
    }

    if (typeof value === "object" && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (_error) {
        return String(value);
      }
    }

    return String(value);
  }

  function addLog(level, parts) {
    const time = new Date().toLocaleTimeString();
    const message = parts.map(formatValue).join(" ");
    logs.push({ time, level, message });

    while (logs.length > MAX_LOGS) {
      logs.shift();
    }

    render();
  }

  function render() {
    const body = document.getElementById("axiomDebugOverlayBody");
    const badge = document.getElementById("axiomDebugOverlayCount");
    if (!body || !badge) return;

    badge.textContent = String(logs.length);

    body.innerHTML = logs
      .slice()
      .reverse()
      .map((item) => {
        return (
          '<div style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);">' +
            '<div style="font-size:11px;opacity:.7;margin-bottom:4px;">[' +
              item.time +
              "] " +
              item.level.toUpperCase() +
            "</div>" +
            '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.45 monospace;color:#fff;">' +
              escapeHtml(item.message) +
            "</pre>" +
          "</div>"
        );
      })
      .join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createUi() {
    const wrap = document.createElement("div");
    wrap.id = "axiomDebugOverlay";
    wrap.style.cssText = [
      "position:fixed",
      "right:12px",
      "bottom:12px",
      "width:360px",
      "max-width:calc(100vw - 24px)",
      "max-height:60vh",
      "background:#0b1220",
      "color:#fff",
      "border:1px solid rgba(255,255,255,.12)",
      "border-radius:12px",
      "box-shadow:0 10px 30px rgba(0,0,0,.35)",
      "z-index:999999",
      "overflow:hidden",
      "font-family:Inter,Arial,sans-serif"
    ].join(";");

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#111a2b;border-bottom:1px solid rgba(255,255,255,.08);">' +
        '<strong style="font-size:13px;">Axiom Debug</strong>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<span id="axiomDebugOverlayCount" style="font-size:12px;opacity:.8;">0</span>' +
          '<button id="axiomDebugOverlayClear" type="button" style="background:#1f2a44;color:#fff;border:0;border-radius:8px;padding:6px 8px;cursor:pointer;">Clear</button>' +
          '<button id="axiomDebugOverlayToggle" type="button" style="background:#1f2a44;color:#fff;border:0;border-radius:8px;padding:6px 8px;cursor:pointer;">Hide</button>' +
        "</div>" +
      "</div>" +
      '<div id="axiomDebugOverlayBody" style="overflow:auto;max-height:calc(60vh - 48px);"></div>';

    document.body.appendChild(wrap);

    const clearBtn = document.getElementById("axiomDebugOverlayClear");
    const toggleBtn = document.getElementById("axiomDebugOverlayToggle");
    const body = document.getElementById("axiomDebugOverlayBody");

    clearBtn.addEventListener("click", function () {
      logs.length = 0;
      render();
    });

    toggleBtn.addEventListener("click", function () {
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      toggleBtn.textContent = isHidden ? "Hide" : "Show";
    });

    render();
  }

  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.log = function (...args) {
    addLog("log", args);
    originalConsoleLog.apply(console, args);
  };

  console.warn = function (...args) {
    addLog("warn", args);
    originalConsoleWarn.apply(console, args);
  };

  console.error = function (...args) {
    addLog("error", args);
    originalConsoleError.apply(console, args);
  };

  window.addEventListener("error", function (event) {
    addLog("error", [
      "window.error:",
      event.message,
      "at",
      event.filename + ":" + event.lineno + ":" + event.colno
    ]);
  });

  window.addEventListener("unhandledrejection", function (event) {
    addLog("error", ["unhandledrejection:", event.reason]);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createUi, { once: true });
  } else {
    createUi();
  }

  addLog("log", ["Debug overlay started"]);
})();
