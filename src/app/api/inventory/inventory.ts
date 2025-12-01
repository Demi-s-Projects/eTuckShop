export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  category: "food" | "drink" | "snack" | "health and wellness" | "home care";
  price: number;
  costPrice: number;
  quantity: number;
  minStockThreshold: number;
  status: "in stock" | "low stock" | "out of stock";
  lastUpdated: string;
  updatedBy: string;
}

export interface InventoryFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  costPrice: string;
  quantity: string;
  minStockThreshold: string;
}
