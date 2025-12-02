import { db } from "@/firebase/config";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";

/** Notification type */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  timestamp: number;
}

/**
 * Add a new notification for a user
 */
export async function addNotification(userId: string, type: string, message: string) {
  await addDoc(collection(db, "notifications"), {
    userId,
    type,
    message,
    read: false,
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to notifications for a user in real-time
 * No composite index needed; sorts client-side
 */
export function subscribeNotifications(
  userId: string,
  callback: (data: Notification[]) => void
) {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Omit<Notification, "id">;
        return { id: doc.id, ...data };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // newest first

    callback(notifications);
  });
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string) {
  const docRef = doc(db, "notifications", notificationId);
  await updateDoc(docRef, { read: true });
}

/**
 * Clear all notifications for a user
 */
export async function clearNotifications(userId: string) {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.forEach((docItem) => batch.delete(docItem.ref));
  await batch.commit();
}
