import { adminDB } from "@/firebase/admin";
import type { INotificationRepository } from "@/repositories/interfaces/INotificationRepository";
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository";

export class FirebaseNotificationRepository implements INotificationRepository {
  constructor(private readonly userRepository: IUserRepository) {}

  async notifyStaff(
    type: "new-order" | "order-status" | "inventory-alert",
    payload: Record<string, unknown>
  ): Promise<void> {
    const staffDocs = await this.userRepository.getStaffUsers();
    if (staffDocs.length === 0) return;

    const batch = adminDB.batch();
    const timestamp = Date.now();

    for (const userDoc of staffDocs) {
      const notifRef = adminDB.collection("notifications").doc();
      batch.set(notifRef, {
        userId: userDoc.id,
        type,
        read: false,
        timestamp,
        ...payload,
      });
    }

    await batch.commit();
  }

  async notifyCustomer(
    userId: string,
    type: string,
    message: string,
    orderId?: number
  ): Promise<void> {
    const notifRef = adminDB.collection("notifications").doc();
    await notifRef.set({
      userId,
      type,
      message,
      read: false,
      timestamp: Date.now(),
      orderId,
    });
  }
}
