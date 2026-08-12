import { supabaseAdmin } from '../config/supabase.js';

export const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .is('read_at', null)
    ]);

    if (error) throw error;
    if (countError) throw countError;

    res.status(200).json({
      notifications: data || [],
      unread_count: count || 0
    });
  } catch (err) {
    console.error('getNotifications Error:', err);
    res.status(500).json({ error: 'NotificationLoadError', message: 'Failed to load notifications.' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ notification: data });
  } catch (err) {
    console.error('markNotificationRead Error:', err);
    res.status(500).json({ error: 'NotificationUpdateError', message: 'Failed to mark notification as read.' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('read_at', null);

    if (error) throw error;

    res.status(200).json({ message: 'Notifications marked as read.' });
  } catch (err) {
    console.error('markAllNotificationsRead Error:', err);
    res.status(500).json({ error: 'NotificationUpdateError', message: 'Failed to mark notifications as read.' });
  }
};
