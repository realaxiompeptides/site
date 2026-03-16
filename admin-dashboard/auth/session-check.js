window.AXIOM_ADMIN_AUTH = {
  async getSession() {
    if (!window.axiomSupabase) return null;

    try {
      const {
        data: { session },
        error
      } = await window.axiomSupabase.auth.getSession();

      if (error) {
        console.error("Session fetch failed:", error);
        return null;
      }

      return session || null;
    } catch (error) {
      console.error("Session fetch exception:", error);
      return null;
    }
  },

  async requireSession(redirectPath) {
    const session = await this.getSession();

    if (!session || !session.user) {
      window.location.href = redirectPath;
      return null;
    }

    return session;
  }
};
