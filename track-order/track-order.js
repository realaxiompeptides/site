document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("trackOrderForm");
  const trackingInput = document.getElementById("trackingNumber");
  const errorEl = document.getElementById("trackOrderError");

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.add("show");
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.remove("show");
  }

  function cleanTrackingNumber(value) {
    return String(value || "").trim().replace(/\s+/g, "");
  }

  if (!form || !trackingInput) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearError();

    const trackingNumber = cleanTrackingNumber(trackingInput.value);

    if (!trackingNumber) {
      showError("Please enter your USPS tracking number.");
      trackingInput.focus();
      return;
    }

    const uspsUrl = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(trackingNumber)}`;
    window.location.href = uspsUrl;
  });

  trackingInput.addEventListener("input", clearError);
});
