/**
 * Inventory Types
 * 
 * Type definitions for inventory management system.
 * Used throughout the application for type-safe inventory operations.
 */

/** Valid inventory item categories */
export type InventoryCategory = "food" | "drink" | "snack" | "health and wellness" | "home care";

/** Inventory stock status */
export type InventoryStatus = "in stock" | "low stock" | "out of stock";

/**
 * Represents an inventory item in the system
 */
export type InventoryItem = {
  /** Unique identifier from Firestore */
  id: string;
  /** Item name */
  name: string;
  /** Optional description of the item */
  description: string;
  /** Item category */
  category: InventoryCategory;
  /** Selling price in JMD */
  price: number;
  /** Cost price for profit calculation */
  costPrice: number;
  /** Current quantity in stock */
  quantity: number;
  /** Threshold for low stock alerts */
  minStockThreshold: number;
  /** Current stock status */
  status: InventoryStatus;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** User ID who last updated the item */
  updatedBy: string;
};

/**
 * Form data for creating/editing inventory items
 * All values are strings for form input handling
 */
export type InventoryFormData = {
  name: string;
  description: string;
  category: string;
  price: string;
  costPrice: string;
  quantity: string;
  minStockThreshold: string;
};
