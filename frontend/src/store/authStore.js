import { create } from 'zustand';
import { supabase } from '../services/supabase.js';

const getAppUrl = () => {
  const configuredUrl = import.meta.env.VITE_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
};

const getAuthRedirectUrl = (path) => `${getAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;

const clearAuthState = () => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  hasInitialized: true,
  error: null
});

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
  pendingVerificationEmail: null,

  isEmailVerified: () => {
    const user = get().user;
    return Boolean(user?.email_confirmed_at || user?.confirmed_at);
  },

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
      const isVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);

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
      return { success: true, profile, emailVerified: isVerified };
    } catch (err) {
      console.error('Login Store Error:', err);
      const message = err.message || 'Failed to login';
      const isUnverified = /email not confirmed|not confirmed/i.test(message);
      set({
        error: message,
        pendingVerificationEmail: isUnverified ? email : get().pendingVerificationEmail,
        isLoading: false
      });
      return { success: false, error: message, emailUnverified: isUnverified, email };
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
          emailRedirectTo: getAuthRedirectUrl('/login?verified=1'),
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

      set({ pendingVerificationEmail: email });

      // Students should verify email first even if a local Supabase project
      // accidentally allows an immediate signup session.
      if (data.session) {
        await supabase.auth.signOut();
      } else {
        set({ pendingVerificationEmail: email });
      }

      set({ ...clearAuthState(), pendingVerificationEmail: email });
      return { success: true, emailConfirmed: false, email };
    } catch (err) {
      console.error('Register Store Error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  resendVerificationEmail: async (email) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login?verified=1')
        }
      });

      if (error) throw error;

      set({ isLoading: false, pendingVerificationEmail: email });
      return { success: true };
    } catch (err) {
      console.error('Resend Verification Error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  verifySignupOtp: async (email, token) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) throw error;

      if (data?.session) {
        await supabase.auth.signOut();
      }

      set({
        ...clearAuthState(),
        pendingVerificationEmail: null
      });
      return { success: true };
    } catch (err) {
      console.error('Verify Signup OTP Error:', err);
      const message = err.message || 'Invalid or expired verification code.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  sendPasswordResetEmail: async (email) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('/reset-password')
      });

      if (error) throw error;

      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      console.error('Password Reset Email Error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  updatePassword: async (password) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      console.error('Update Password Error:', err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  updateProfileDetails: async ({ full_name }) => {
    try {
      const { profile } = get();
      if (!profile?.id) throw new Error('Profile not loaded');

      const cleanName = String(full_name || '').trim();
      if (cleanName.length < 2) throw new Error('Full name must be at least 2 characters');

      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: cleanName })
        .eq('id', profile.id)
        .select('*')
        .single();

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { full_name: cleanName }
      });

      const normalizedProfile = normalizeProfileAccess(data);
      set({
        profile: normalizedProfile,
        isLoading: false
      });
      return { success: true, profile: normalizedProfile };
    } catch (err) {
      console.error('Update Profile Details Error:', err);
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
        error: null,
        pendingVerificationEmail: null
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
