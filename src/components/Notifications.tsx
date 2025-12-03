"use client";
import React, { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import styles from "@/styles/TopBar.module.css";

export default function Notifications() {
  const { notifications, markNotificationRead, clearNotifications, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = () => setOpen((s) => !s);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={handleToggle} aria-label="Notifications" className={styles.logoutButton}>
        🔔
        {unreadCount > 0 && (
          <span style={{ marginLeft: 8, background: "#e53935", color: "white", borderRadius: 12, padding: "2px 6px", fontSize: 12 }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            width: 'min(92vw, 420px)',
            background: "#fff",
            border: "1px solid #eaeaea",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            zIndex: 1000,
            fontFamily: 'Inter, Arial, sans-serif',
            padding: 0,
            maxWidth: '96vw',
          }}
        >
          <div style={{ padding: "14px 16px 10px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: "#0070f3", fontFamily: 'Inter, Arial, sans-serif' }}>Notifications</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: "#666" }}>{notifications.length} total</span>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        setMarkingAll(true);
                        await markAllRead();
                      } catch (err) {
                        console.error('Failed to mark all read:', err);
                      } finally {
                        setMarkingAll(false);
                      }
                    }}
                    disabled={markingAll}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                  >
                    {markingAll ? 'Marking...' : 'Mark all read'}
                  </button>

                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={clearing}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                  >
                    {clearing ? 'Clearing...' : 'Clear all'}
                  </button>

                  {showConfirm && (
                    <div style={{ position: 'absolute', top: 56, right: 12, width: 'min(90vw, 360px)', background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 1100, fontFamily: 'Inter, Arial, sans-serif' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Clear notifications?</div>
                      <div style={{ color: '#555', marginBottom: 12, fontSize: 13 }}>Remove all notifications — this cannot be undone.</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          onClick={() => setShowConfirm(false)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setClearing(true);
                              await clearNotifications();
                              setShowConfirm(false);
                            } catch (err) {
                              console.error('Failed to clear notifications:', err);
                            } finally {
                              setClearing(false);
                            }
                          }}
                          style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                        >
                          {clearing ? 'Clearing...' : 'Clear'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ maxHeight: '60vh', overflow: "auto", padding: "8px 0" }}>
            {notifications.length === 0 && (
              <div style={{ padding: 18, color: "#888", textAlign: "center", fontSize: 16, fontFamily: 'Inter, Arial, sans-serif' }}>No notifications yet.</div>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 14,
                  margin: "0 12px 14px 12px",
                  background: n.read ? "#f7fafd" : "#e6f7ff",
                  borderRadius: 8,
                  fontSize: 16,
                  boxShadow: n.read ? undefined : "0 2px 8px rgba(0,0,0,0.08)",
                  border: n.read ? "1px solid #eaeaea" : "1px solid #b2e0ff",
                  fontFamily: 'Inter, Arial, sans-serif',
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, background: "#eef2ff", color: "#0070f3", fontWeight: 600, fontFamily: 'Inter, Arial, sans-serif' }}>
                      {n.type === "order" ? "Order Update" : n.type === "system" ? "System" : "Notification"}
                    </span>
                    <div style={{ fontSize: 15, fontWeight: n.read ? 500 : 700, color: "#222", fontFamily: 'Inter, Arial, sans-serif' }}>{n.message}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", fontFamily: 'Inter, Arial, sans-serif', alignSelf: "flex-end", marginTop: 2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{formatTime(n.timestamp)}</div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        fontSize: 13,
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: "#0070f3",
                        color: "#fff",
                        cursor: "pointer",
                        fontFamily: 'Inter, Arial, sans-serif',
                        fontWeight: 500,
                        marginTop: 2,
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
