import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { C } from "../theme.jsx";
import { api } from "../api.js";
import { toFa } from "../jalali.js";

export default function NotificationsDropdown({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.listNotifications();
      setNotifications(d.notifications || []);
      setUnreadCount(d.unread_count || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCount = useCallback(async () => {
    try {
      const d = await api.getUnreadNotificationCount();
      setUnreadCount(d.unread_count || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [loadCount]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function handleMarkAsRead(id) {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((list) =>
        list.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteNotification(id);
      setNotifications((list) => list.filter((n) => n.id !== id));
      loadCount();
    } catch {
      // ignore
    }
  }

  function handleNotificationClick(n) {
    if (!n.is_read) handleMarkAsRead(n.id);
    if (n.link && onNavigate) {
      onNavigate(n.link);
      setOpen(false);
    }
  }

  function formatTime(iso) {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "همین حالا";
    if (diffMin < 60) return `${toFa(diffMin)} دقیقه پیش`;
    if (diffHour < 24) return `${toFa(diffHour)} ساعت پیش`;
    if (diffDay < 7) return `${toFa(diffDay)} روز پیش`;
    return date.toLocaleDateString("fa-IR");
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="اعلان‌ها"
        style={{
          width: 38, height: 38, borderRadius: 11,
          border: `1px solid ${C.border}`,
          background: C.surface,
          color: C.inkSoft,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: C.clay,
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
              border: `2px solid ${C.surface}`,
            }}
          >
            {unreadCount > 99 ? "99+" : toFa(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            maxHeight: 480,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,.18)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>
              اعلان‌ها
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.teal,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Check size={13} /> خواندن همه
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && (
              <div style={{ padding: 24, textAlign: "center", color: C.inkSoft, fontSize: 12.5 }}>
                در حال بارگذاری...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <Bell size={28} color={C.inkFaint} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: C.inkSoft, fontWeight: 700 }}>
                  اعلانی وجود ندارد
                </div>
                <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>
                  اعلان‌های جدید اینجا نمایش داده می‌شوند.
                </div>
              </div>
            )}

            {!loading && notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "11px 14px",
                  borderBottom: `1px solid ${C.border}`,
                  background: n.is_read ? "transparent" : C.tealSoft + "55",
                  cursor: n.link ? "pointer" : "default",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
                onClick={() => handleNotificationClick(n)}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: n.is_read ? C.borderStrong : C.teal,
                    marginTop: 6, flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 3 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.7, marginBottom: 5 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.inkFaint }}>
                    {formatTime(n.created_at)}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  title="حذف"
                  style={{
                    border: "none", background: "transparent",
                    color: C.inkFaint, cursor: "pointer",
                    padding: 4, flexShrink: 0,
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}