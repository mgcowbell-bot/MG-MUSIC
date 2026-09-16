window.MGMusicAuth = {
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return { session: null, error };
      }
      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  },

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, message: 'Login failed. Check your email and password.' };
      }
      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, message: 'Login failed. Please check your internet connection.' };
    }
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, message: 'Logout failed.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Logout failed. Please try again.' };
    }
  }
};
