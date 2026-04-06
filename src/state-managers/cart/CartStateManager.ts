import type { CartItem, MenuItem } from "@/types/MenuItem";

export class CartStateManager {
  addItem(items: CartItem[], item: MenuItem): { items: CartItem[]; action: "added" | "incremented" } {
    const existingItem = items.find((i) => i.id === item.id);
    if (existingItem) {
      return {
        action: "incremented",
        items: items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)),
      };
    }

    return {
      action: "added",
      items: [...items, { ...item, quantity: 1 }],
    };
  }

  removeItem(items: CartItem[], itemId: string): { items: CartItem[]; removedItemName: string | null } {
    const item = items.find((i) => i.id === itemId);
    return {
      removedItemName: item?.name || null,
      items: items.filter((i) => i.id !== itemId),
    };
  }

  updateQuantity(items: CartItem[], itemId: string, quantity: number): { items: CartItem[]; removedItemName: string | null } {
    if (quantity <= 0) {
      return this.removeItem(items, itemId);
    }

    return {
      removedItemName: null,
      items: items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    };
  }

  totalItems(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  totalPrice(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
