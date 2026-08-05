import { supabaseAdmin } from '../config/supabase.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is missing or malformed.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate token with Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token.'
      });
    }

    // Retrieve full profile details including custom database role and subscription access
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Do not silently downgrade an existing admin to student when the profile
      // query itself is failing; that makes admin data appear/disappear.
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile lookup failed:', profileError);
        return res.status(503).json({
          error: 'ProfileLookupError',
          message: 'Could not verify user profile. Please retry shortly.'
        });
      }

      const metadataRole = user.app_metadata?.role || user.user_metadata?.role || 'student';

      // Fallback only when the profile row is genuinely missing.
      req.user = {
        id: user.id,
        email: user.email,
        role: metadataRole,
        has_full_access: metadataRole === 'admin'
      };
      return next();
    }

    const premiumExpiry = profile.premium_access_expires_at ? new Date(profile.premium_access_expires_at) : null;
    const isExpired = premiumExpiry && premiumExpiry.getTime() <= Date.now();
    const isStudent = profile.role === 'student';

    if (isStudent && profile.has_full_access && isExpired) {
      const { error: expireError } = await supabaseAdmin
        .from('profiles')
        .update({ has_full_access: false })
        .eq('id', profile.id);

      if (expireError) {
        console.error('Failed to expire premium access:', expireError);
      }
    }

    req.user = {
      ...profile,
      has_full_access: Boolean(profile.has_full_access && !isExpired)
    };
    next();
  } catch (err) {
    console.error('Auth Middleware Exception:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to authorize user session.'
    });
  }
};
