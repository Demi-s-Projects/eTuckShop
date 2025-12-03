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
 * Add a notification for all users with a specific role (owner/employee)
 */
export async function addNotificationToRole(role: "owner" | "employee", type: string, message: string) {
  // Fetch all users with the role
  const usersQuery = query(collection(db, "users"), where("role", "==", role));
  const snapshot = await getDocs(usersQuery);
  const batch = writeBatch(db);

  snapshot.forEach((userDoc) => {
    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
      userId: userDoc.id,
      type,
      message,
      read: false,
      timestamp: Date.now(),
    });
  });

  await batch.commit();
}

/**
 * Subscribe to notifications for a user in real-time
 */
export function subscribeNotifications(
  userId: string,
  callback: (data: Notification[]) => void
) {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Notification, "id">) }))
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
 * Mark all notifications for a user as read (batched)
 */
export async function markAllAsRead(userId: string) {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.forEach((docItem) => batch.update(doc(db, "notifications", docItem.id), { read: true }));
  await batch.commit();
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
