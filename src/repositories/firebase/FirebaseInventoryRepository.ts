import { adminDB } from "@/firebase/admin";
import type { IInventoryRepository } from "@/repositories/interfaces/IInventoryRepository";
import type { InventoryStatus } from "@/domain/enums/InventoryStatus";

const INVENTORY_COLLECTION = "inventory";

export class FirebaseInventoryRepository implements IInventoryRepository {
  async getAllItems(): Promise<Array<Record<string, unknown>>> {
    const inventorySnapshot = await adminDB.collection(INVENTORY_COLLECTION).get();
    return inventorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getItemById(itemId: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
    const itemDoc = await adminDB.collection(INVENTORY_COLLECTION).doc(itemId).get();
    if (!itemDoc.exists) return null;
    return { id: itemDoc.id, data: (itemDoc.data() || {}) as Record<string, unknown> };
  }

  async createItem(data: Record<string, unknown>): Promise<string> {
    const docRef = await adminDB.collection(INVENTORY_COLLECTION).add(data);
    return docRef.id;
  }

  async updateItem(itemId: string, data: Record<string, unknown>): Promise<void> {
    await adminDB.collection(INVENTORY_COLLECTION).doc(itemId).update(data);
  }

  async deleteItem(itemId: string): Promise<void> {
    await adminDB.collection(INVENTORY_COLLECTION).doc(itemId).delete();
  }

  async getByIds(ids: string[]): Promise<Map<string, FirebaseFirestore.DocumentSnapshot>> {
    if (ids.length === 0) return new Map();

    const refs = ids.map((id) => adminDB.collection(INVENTORY_COLLECTION).doc(id));
    const docs = await adminDB.getAll(...refs);
    const result = new Map<string, FirebaseFirestore.DocumentSnapshot>();

    docs.forEach((doc) => result.set(doc.id, doc));
    return result;
  }

  async commitBatchUpdate(
    updates: Array<{ ref: unknown; data: Record<string, unknown> }>
  ): Promise<void> {
    const batch = adminDB.batch();
    updates.forEach((u) => batch.update(u.ref as FirebaseFirestore.DocumentReference, u.data));
    await batch.commit();
  }

  calculateStatus(quantity: number, minStockThreshold: number): InventoryStatus {
    if (quantity <= 0) return "out of stock";
    if (quantity <= minStockThreshold) return "low stock";
    return "in stock";
  }
}
