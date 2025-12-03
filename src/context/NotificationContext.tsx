"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { subscribeNotifications, markAsRead, clearNotifications as clearNotificationsUtil, markAllAsRead as markAllAsReadUtil } from "@/util/notifications";
import { useAuth } from "@/context/AuthContext";

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Use AuthContext to get authenticated user instead of creating a separate auth listener
  const authContext = useAuth();
  useEffect(() => {
    if (authContext && authContext.user) {
      setUserId(authContext.user.uid);
    } else {
      setUserId(null);
    }
  }, [authContext]);

  // Subscribe to notifications in real-time
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const unsubscribe = subscribeNotifications(userId, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe && unsubscribe();
  }, [userId]);

  const markNotificationRead = async (id: string) => {
    await markAsRead(id);
  };

  const clearNotifications = async () => {
    if (!userId) return;
    await clearNotificationsUtil(userId);
    setNotifications([]);
  };

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await markAllAsReadUtil(userId);
      // optimistically update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, markNotificationRead, clearNotifications, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
