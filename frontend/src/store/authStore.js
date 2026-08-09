import { create } from 'zustand';
import { supabase } from '../services/supabase.js';

const normalizeProfileAccess = (profile) => {
  if (!profile) return profile;

  const premiumExpiry = profile.premium_access_expires_at ? new Date(profile.premium_access_expires_at) : null;
  const isExpired = premiumExpiry && premiumExpiry.getTime() <= Date.now();

  return {
    ...profile,
    has_full_access: Boolean(profile.has_full_access && !isExpired)
  };
};

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  hasInitialized: false,
  error: null,

  // Initialize session and set auth states
  initializeAuth: async (force = false) => {
    const current = get();
    if (!force && current.hasInitialized) {
      return;
    }

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
            has_full_access: user.user_metadata?.role === 'admin',
            premium_access_expires_at: null
          };
          set({
            user,
            profile: normalizeProfileAccess(fallbackProfile),
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
            hasInitialized: true
          });
          return;
        }

        set({
          user,
          profile: normalizeProfileAccess(profile),
          token: access_token,
          isAuthenticated: true,
          isLoading: false,
          hasInitialized: true
        });
      } else {
        set({ user: null, profile: null, token: null, isAuthenticated: false, isLoading: false, hasInitialized: true });
      }
    } catch (err) {
      console.error('initializeAuth Exception:', err);
      set({ error: err.message, isLoading: false, hasInitialized: true });
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
        profile: normalizeProfileAccess(profile),
        token: session.access_token,
        isAuthenticated: true,
        isLoading: false,
        hasInitialized: true
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
          profile: normalizeProfileAccess(profile || { id: user.id, email: user.email, role: 'student', has_full_access: false, premium_access_expires_at: null }),
          token: session.access_token,
          isAuthenticated: true,
          isLoading: false,
          hasInitialized: true
        });
        return { success: true, emailConfirmed: true };
      } else {
        set({ isLoading: false, hasInitialized: true });
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
        hasInitialized: true,
        error: null
      });
    } catch (err) {
      console.error('Logout Store Error:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  // Admin access update profile helper
  updateProfileAccess: (hasAccess, premiumAccessExpiresAt = null) => {
    const { profile } = get();
    if (profile) {
      set({
        profile: normalizeProfileAccess({
          ...profile,
          has_full_access: hasAccess,
          premium_access_expires_at: premiumAccessExpiresAt
        })
      });
    }
  }
}));
