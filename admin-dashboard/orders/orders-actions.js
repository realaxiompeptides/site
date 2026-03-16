window.AXIOM_ORDER_ACTIONS = {
  async updateSessionStatus(sessionId, status) {
    if (!window.axiomSupabase) return false;

    const { error } = await window.axiomSupabase
      .from("checkout_sessions")
      .update({
        session_status: status,
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Session status update failed:", error);
      return false;
    }

    return true;
  },

  async markPending(sessionId) {
    return this.updateSessionStatus(sessionId, "pending_payment");
  },

  async markAbandoned(sessionId) {
    return this.updateSessionStatus(sessionId, "abandoned");
  },

  async markConverted(sessionId) {
    return this.updateSessionStatus(sessionId, "converted");
  }
};
