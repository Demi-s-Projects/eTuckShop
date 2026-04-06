import type { InventoryStatus } from "@/domain/enums/InventoryStatus";

export interface IInventoryRepository {
  getAllItems(): Promise<Array<Record<string, unknown>>>;
  getItemById(itemId: string): Promise<{ id: string; data: Record<string, unknown> } | null>;
  createItem(data: Record<string, unknown>): Promise<string>;
  updateItem(itemId: string, data: Record<string, unknown>): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  getByIds(ids: string[]): Promise<Map<string, FirebaseFirestore.DocumentSnapshot>>;
  commitBatchUpdate(updates: Array<{ ref: unknown; data: Record<string, unknown> }>): Promise<void>;
  calculateStatus(quantity: number, minStockThreshold: number): InventoryStatus;
}
