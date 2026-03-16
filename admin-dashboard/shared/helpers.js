window.AXIOM_HELPERS = {
  uuid() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  nowIso() {
    return new Date().toISOString();
  },

  getStorage(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Storage read failed:", key, error);
      return fallback;
    }
  },

  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Storage write failed:", key, error);
    }
  },

  getVisitorId() {
    const key = window.AXIOM_TRACKING_CONFIG.STORAGE_KEYS.VISITOR_ID;
    let id = localStorage.getItem(key);

    if (!id) {
      id = window.AXIOM_HELPERS.uuid();
      localStorage.setItem(key, id);
    }

    return id;
  },

  getCheckoutSessionId() {
    const key = window.AXIOM_TRACKING_CONFIG.STORAGE_KEYS.CHECKOUT_SESSION_ID;
    return localStorage.getItem(key) || "";
  },

  setCheckoutSessionId(id) {
    const key = window.AXIOM_TRACKING_CONFIG.STORAGE_KEYS.CHECKOUT_SESSION_ID;
    localStorage.setItem(key, id);
  },

  clearCheckoutSessionId() {
    const key = window.AXIOM_TRACKING_CONFIG.STORAGE_KEYS.CHECKOUT_SESSION_ID;
    localStorage.removeItem(key);
  },

  getCart() {
    const key = window.AXIOM_TRACKING_CONFIG.STORAGE_KEYS.CART;
    return window.AXIOM_HELPERS.getStorage(key, []) || [];
  },

  getItemQuantity(item) {
    return Number(item.quantity || item.qty || 0);
  },

  formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }
};
