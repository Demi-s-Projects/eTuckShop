import type { MenuItem } from "@/types/MenuItem";
import type { InventoryItem, InventoryCategory } from "@/app/api/inventory/inventory";

export class MenuStateManager {
  mapCategory(cat: InventoryCategory): MenuItem["category"] {
    switch (cat) {
      case "snack":
        return "Snacks";
      case "drink":
        return "Drinks";
      case "food":
        return "Food";
      case "health and wellness":
        return "Health and Wellness";
      case "home care":
        return "Home Care";
      default:
        return "Meals";
    }
  }

  mapInventoryDoc(docId: string, data: InventoryItem): MenuItem {
    return {
      id: docId,
      name: data.name,
      description: data.description || "",
      price: data.price || 0,
      category: this.mapCategory(data.category),
      lowStock: data.status === "low stock",
      available: data.status === "in stock" || data.status === "low stock",
      lastUpdated: data.lastUpdated || null,
    };
  }
}
