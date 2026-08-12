import { supabaseAdmin } from '../config/supabase.js';

const uniq = (items) => [...new Set(items.filter(Boolean))];

export const getProfilesByRoles = async (roles = []) => {
  if (!roles.length) return [];

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .in('role', roles);

  if (error) {
    console.error('getProfilesByRoles notification lookup failed:', error);
    return [];
  }

  return data || [];
};

export const createNotifications = async (notifications = []) => {
  const rows = notifications
    .filter(item => item?.user_id && item?.title && item?.body)
    .map(item => ({
      user_id: item.user_id,
      actor_id: item.actor_id || null,
      type: item.type || 'system',
      title: item.title,
      body: item.body,
      link: item.link || null,
      metadata: item.metadata || {}
    }));

  if (!rows.length) return;

  const { error } = await supabaseAdmin
    .from('notifications')
    .insert(rows);

  if (error) {
    console.error('createNotifications failed:', error);
  }
};

export const notifyRoles = async ({ roles, actorId, type, title, body, link, metadata, excludeUserIds = [] }) => {
  const profiles = await getProfilesByRoles(roles);
  const excluded = new Set(excludeUserIds.filter(Boolean));
  const recipientIds = uniq(profiles.map(profile => profile.id)).filter(id => !excluded.has(id));

  await createNotifications(recipientIds.map(userId => ({
    user_id: userId,
    actor_id: actorId,
    type,
    title,
    body,
    link,
    metadata
  })));
};
