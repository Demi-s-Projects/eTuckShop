export interface INotificationRepository {
  notifyStaff(type: "new-order" | "order-status" | "inventory-alert", payload: Record<string, unknown>): Promise<void>;
  notifyCustomer(userId: string, type: string, message: string, orderId?: number): Promise<void>;
}
