import { adminDB } from "@/firebase/admin";
import type { IReportReadRepository } from "@/repositories/interfaces/IReportReadRepository";

export class FirebaseReportReadRepository implements IReportReadRepository {
  async getCompletedOrdersInRange(start: Date, end: Date): Promise<FirebaseFirestore.QuerySnapshot> {
    return adminDB
      .collection("orders")
      .where("status", "==", "completed")
      .where("OrderTime", ">=", start)
      .where("OrderTime", "<=", end)
      .get();
  }

  async getInventoryLowercase(): Promise<FirebaseFirestore.QuerySnapshot> {
    return adminDB.collection("inventory").get();
  }

  async getInventoryCapitalized(): Promise<FirebaseFirestore.QuerySnapshot> {
    return adminDB.collection("Inventory").get();
  }
}
