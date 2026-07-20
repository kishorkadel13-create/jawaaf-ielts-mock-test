import { create } from 'zustand';
import { supabase } from '../services/supabase.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize session and set auth states
  initializeAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { user, access_token } = session;
        
        // Fetch customized profile from db
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.warn('Profile retrieve warning:', profileError.message);
          // Fallback if profile trigger is processing
          const fallbackProfile = {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'student',
            has_full_access: user.user_metadata?.role === 'admin'
          };
          set({
            user,
            profile: fallbackProfile,
            token: access_token,
            isAuthenticated: true,
            isLoading: false
          });
          return;
        }

        set({
          user,
          profile,
          token: access_token,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        set({ user: null, profile: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      console.error('initializeAuth Exception:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  // Log in with Email and Password
  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      const { user, session } = data;

      // Load corresponding custom database profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      set({
        user,
        profile,
        token: session.access_token,
        isAuthenticated: true,
        isLoading: false
      });
      return { success: true, profile };
    } catch (err) {
      console.error('Login Store Error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  // Register a new Student Account
  register: async (email, password, fullName, phone, interestedCountry, targetScore) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student',
            phone,
            interested_country: interestedCountry,
            target_score: targetScore
          }
        }
      });

      if (error) throw error;

      // In Supabase, if email confirmation is off, it logs in automatically.
      // If it is on, user needs to verify their mail. We'll handle both.
      if (data.session) {
        const { user, session } = data;
        
        // Wait a half-second to let background triggers complete writing profiles
        await new Promise(resolve => setTimeout(resolve, 600));

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({
          user,
          profile: profile || { id: user.id, email: user.email, role: 'student', has_full_access: false },
          token: session.access_token,
          isAuthenticated: true,
          isLoading: false
        });
        return { success: true, emailConfirmed: true };
      } else {
        set({ isLoading: false });
        return { success: true, emailConfirmed: false };
      }
    } catch (err) {
      console.error('Register Store Error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  // Log Out and clear session parameters
  logout: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({
        user: null,
        profile: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error('Logout Store Error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  // Admin access update profile helper
  updateProfileAccess: (hasAccess) => {
    const { profile } = get();
    if (profile) {
      set({ profile: { ...profile, has_full_access: hasAccess } });
    }
  }
}));
