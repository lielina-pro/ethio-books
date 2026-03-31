import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const PRIMARY_BLUE = '#007BFF';
const API_BASE = process.env.REACT_APP_API_URL || 'https://ethio-books.onrender.com';

const NotificationBell = ({ token }) => {
  const api = useMemo(() => {
    return axios.create({
      baseURL: `${API_BASE}/api`,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [token]);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);
  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const rows = Array.isArray(res.data) ? res.data : [];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.read).length);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[NotificationBell] fetchNotifications error:', e?.response?.data || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchNotifications();

    const socket = io(API_BASE, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('notification', () => {
      // Keep UI in sync with what is stored in DB.
      fetchNotifications();
    });

    return () => {
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await api.patch('/notifications/mark-all-read');
      await fetchNotifications();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[NotificationBell] markAllRead error:', e?.response?.data || e);
    }
  };

  const toggleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      await markAllRead();
    }
  };

  const handleMarkOneRead = async (id) => {
    if (!token) return;
    try {
      await api.patch(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[NotificationBell] markOneRead error:', e?.response?.data || e);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50 transition"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] px-1 rounded-full items-center justify-center bg-red-600 text-white text-[10px] font-extrabold border-2 border-white"
            style={{ backgroundColor: '#dc2626' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden z-[60]">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-extrabold text-gray-900">Notifications</div>
            <div className="text-xs font-bold" style={{ color: PRIMARY_BLUE }}>
              {unreadCount} unread
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {loading ? (
              <div className="px-3 py-4 text-sm text-gray-500">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500">No notifications.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => (n.read ? null : handleMarkOneRead(n._id))}
                  className={`w-full text-left px-3 py-3 rounded-xl border border-transparent hover:bg-gray-50 transition ${
                    n.read ? 'bg-white' : 'bg-blue-50/40 border-blue-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-xs font-extrabold ${n.read ? 'text-gray-800' : 'text-gray-900'}`}>
                        {n.title ? n.title : n.type.replaceAll('_', ' ')}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 line-clamp-3">{n.message}</div>
                    </div>
                    <div className="text-[10px] text-gray-400 shrink-0">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

