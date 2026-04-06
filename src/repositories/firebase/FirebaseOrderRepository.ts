import { adminDB } from "@/firebase/admin";
import type { IOrderRepository } from "@/repositories/interfaces/IOrderRepository";
import type { Order } from "@/types/Order";

const ORDERS_COLLECTION = "orders";

export class FirebaseOrderRepository implements IOrderRepository {
  async getByOrderId(orderId: number): Promise<{ id: string; order: Order } | null> {
    const snapshot = await adminDB
      .collection(ORDERS_COLLECTION)
      .where("OrderID", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      order: {
        OrderID: data.OrderID,
        OrderTime: data.OrderTime.toDate(),
        userId: data.userId,
        displayName: data.displayName,
        OrderContents: data.OrderContents,
        TotalPrice: data.TotalPrice,
        status: data.status || "pending",
      },
    };
  }

  async getByUserId(userId: string): Promise<Order[]> {
    const snapshot = await adminDB
      .collection(ORDERS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        OrderID: data.OrderID,
        OrderTime: data.OrderTime.toDate(),
        userId: data.userId,
        displayName: data.displayName,
        OrderContents: data.OrderContents,
        TotalPrice: data.TotalPrice,
        status: data.status || "pending",
      };
    });
  }

  async getAll(): Promise<Order[]> {
    const snapshot = await adminDB
      .collection(ORDERS_COLLECTION)
      .orderBy("OrderTime", "desc")
      .get();

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        OrderID: data.OrderID,
        OrderTime: data.OrderTime.toDate(),
        userId: data.userId,
        displayName: data.displayName,
        OrderContents: data.OrderContents,
        TotalPrice: data.TotalPrice,
        status: data.status || "pending",
      };
    });
  }

  async create(input: {
    userId: string;
    displayName: string;
    orderContents: Order["OrderContents"];
    totalPrice: number;
    status: Order["status"];
  }): Promise<{ orderId: number; documentId: string }> {
    const nextOrderId = await adminDB.runTransaction(async (transaction: any) => {
      const lastOrderSnapshot = await transaction.get(
        adminDB.collection(ORDERS_COLLECTION).orderBy("OrderID", "desc").limit(1)
      );

      return lastOrderSnapshot.empty
        ? 1
        : lastOrderSnapshot.docs[0].data().OrderID + 1;
    });

    const docRef = await adminDB.collection(ORDERS_COLLECTION).add({
      OrderID: nextOrderId,
      OrderTime: new Date(),
      userId: input.userId,
      displayName: input.displayName,
      OrderContents: input.orderContents,
      TotalPrice: input.totalPrice,
      status: input.status,
    });

    return { orderId: nextOrderId, documentId: docRef.id };
  }

  async updateByDocumentId(
    documentId: string,
    update: Partial<Pick<Order, "displayName" | "OrderContents" | "TotalPrice" | "status">>
  ): Promise<void> {
    await adminDB.collection(ORDERS_COLLECTION).doc(documentId).update(update);
  }

  async deleteByOrderId(orderId: number): Promise<boolean> {
    const snapshot = await adminDB
      .collection(ORDERS_COLLECTION)
      .where("OrderID", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }
}
