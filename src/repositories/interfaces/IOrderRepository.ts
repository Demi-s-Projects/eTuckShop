import type { Order } from "@/types/Order";

export interface IOrderRepository {
  getByOrderId(orderId: number): Promise<{ id: string; order: Order } | null>;
  getByUserId(userId: string): Promise<Order[]>;
  getAll(): Promise<Order[]>;
  create(input: {
    userId: string;
    displayName: string;
    orderContents: Order["OrderContents"];
    totalPrice: number;
    status: Order["status"];
  }): Promise<{ orderId: number; documentId: string }>;
  updateByDocumentId(documentId: string, update: Partial<Pick<Order, "displayName" | "OrderContents" | "TotalPrice" | "status">>): Promise<void>;
  deleteByOrderId(orderId: number): Promise<boolean>;
}
