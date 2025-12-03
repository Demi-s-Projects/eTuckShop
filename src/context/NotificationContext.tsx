"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { subscribeNotifications, markAsRead } from "@/util/notifications";
import { useCart } from "./CartContext"; // optional if you want userId from cart/auth
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribeAuth();
  }, []);

  // Subscribe to notifications in real-time
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeNotifications(userId, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [userId]);

  const markNotificationRead = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <NotificationContext.Provider value={{ notifications, markNotificationRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
