import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '../services/api';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
};

type NotificationBellProps = {
  className?: string;
  iconClassName?: string;
  badgeClassName?: string;
  fallbackCount?: number;
};

const relativeTime = (value?: string) => {
  if (!value) return '';
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return '';

  const seconds = Math.max(1, Math.floor((Date.now() - created) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationBell({
  className = 'relative grid h-11 w-11 place-items-center rounded-2xl text-[#294b77] transition-colors hover:bg-[#EFF4FB]',
  iconClassName = 'h-5 w-5',
  badgeClassName = 'absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef5f55] px-1 text-[10px] font-black text-white',
  fallbackCount = 0
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(fallbackCount);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/notifications', { params: { limit: 20 } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unread_count || 0));
    } catch (error) {
      console.warn('Failed to load notifications:', error);
      setUnreadCount(fallbackCount);
    } finally {
      setLoading(false);
    }
  }, [fallbackCount]);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setOpen(current => !current);
    if (!open) {
      loadNotifications();
    }
  };

  const markRead = async (notification: NotificationItem) => {
    if (notification.read_at) return;
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      setNotifications(current => current.map(item => (
        item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
      )));
      setUnreadCount(count => Math.max(0, count - 1));
    } catch (error) {
      console.warn('Failed to mark notification read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      const readAt = new Date().toISOString();
      setNotifications(current => current.map(item => ({ ...item, read_at: item.read_at || readAt })));
      setUnreadCount(0);
    } catch (error) {
      console.warn('Failed to mark all notifications read:', error);
    }
  };

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={toggleOpen} className={className} aria-label="Notifications">
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className={badgeClassName}>{displayCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-[14px] font-black text-[#061A36]">Notifications</h3>
              <p className="text-[11px] font-bold text-slate-400">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black text-[#294b77] hover:bg-[#EFF4FB] disabled:text-slate-300"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Read all
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && !notifications.length ? (
              <div className="grid min-h-[140px] place-items-center text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : notifications.length ? (
              notifications.map(notification => {
                const content = (
                  <div className={`border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] ${notification.read_at ? 'bg-white' : 'bg-[#EFF4FB]/55'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read_at ? 'bg-slate-200' : 'bg-[#ef5f55]'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-black leading-5 text-[#061A36]">{notification.title}</span>
                        <span className="mt-1 block text-[12px] font-semibold leading-5 text-slate-500">{notification.body}</span>
                        <span className="mt-1 block text-[11px] font-bold text-slate-400">{relativeTime(notification.created_at)}</span>
                      </span>
                    </div>
                  </div>
                );

                return notification.link ? (
                  <Link key={notification.id} to={notification.link} onClick={() => { markRead(notification); setOpen(false); }}>
                    {content}
                  </Link>
                ) : (
                  <button key={notification.id} type="button" onClick={() => markRead(notification)} className="block w-full">
                    {content}
                  </button>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-[13px] font-bold text-slate-500">No notifications yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
