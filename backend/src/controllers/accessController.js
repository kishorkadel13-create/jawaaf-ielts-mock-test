import { supabaseAdmin } from '../config/supabase.js';

// Student requests full platform access
export const requestAccess = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has access approved
    if (req.user.has_full_access) {
      return res.status(400).json({ error: 'BadRequest', message: 'User already has full access.' });
    }

    // Check for existing pending request
    const { data: existingRequest, error: checkError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return res.status(400).json({ error: 'BadRequest', message: 'You have a pending access request already.' });
    }

    // Create access request
    const { data: accessReq, error } = await supabaseAdmin
      .from('access_requests')
      .insert([{ user_id: userId, status: 'pending' }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Access request submitted successfully.',
      request: accessReq
    });
  } catch (err) {
    console.error('requestAccess Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to request premium access.' });
  }
};

// Admin lists all access requests (Admin Only)
export const getAccessRequests = async (req, res) => {
  try {
    const { data: requests, error } = await supabaseAdmin
      .from('access_requests')
      .select(`
        *,
        profiles!access_requests_user_id_fkey (
          full_name,
          email
        )
      `)
      .order('requested_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(requests);
  } catch (err) {
    console.error('getAccessRequests Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve access requests.' });
  }
};

// Admin approves or rejects access requests (Admin Only)
export const reviewAccessRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'BadRequest', message: 'Invalid status choice.' });
    }

    // 1. Fetch access request record
    const { data: request, error: reqError } = await supabaseAdmin
      .from('access_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Access request not found.' });
    }

    // 2. Perform transaction update
    const { error: updateReqError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id
      })
      .eq('id', id);

    if (updateReqError) throw updateReqError;

    // 3. If approved, unlock user profile's access
    if (status === 'approved') {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ has_full_access: true })
        .eq('id', request.user_id);

      if (profileError) throw profileError;
    } else {
      // If rejected and they previously had access, optionally reset access (not required but secure)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ has_full_access: false })
        .eq('id', request.user_id);

      if (profileError) throw profileError;
    }

    res.status(200).json({
      message: `Access request ${status} successfully.`,
      request_id: id,
      status
    });
  } catch (err) {
    console.error('reviewAccessRequest Error:', err);
    res.status(500).json({ error: 'DatabaseError', message: 'Failed to update access request.' });
  }
};
