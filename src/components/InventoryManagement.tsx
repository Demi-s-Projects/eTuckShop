/**
 * Inventory Management Component
 *
 * A spreadsheet-like interface for managing inventory items.
 * Supports inline editing, adding, updating, and deleting items.
 * Used by both owner and employee pages with theme customization.
 *
 * Features:
 * - Spreadsheet-style table with inline editing
 * - Filter by stock status (all, in stock, low stock, out of stock)
 * - Add new items via modal form
 * - Delete items with confirmation
 * - Real-time status updates based on quantity changes
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  InventoryItem,
  InventoryFormData,
  InventoryCategory,
  InventoryStatus,
} from "@/app/api/inventory/inventory";
import styles from "@/styles/Inventory.module.css";

/** Props for the InventoryManagement component */
type InventoryManagementProps = {
  /** Theme color: "blue" for owner, "green" for employee */
  theme: "blue" | "green";
};

/** Category options for the dropdown */
const CATEGORY_OPTIONS: InventoryCategory[] = [
  "food",
  "drink",
  "snack",
  "health and wellness",
  "home care",
];

/** Filter status options */
const FILTER_OPTIONS: Array<"all" | InventoryStatus> = [
  "all",
  "in stock",
  "low stock",
  "out of stock",
];

/** Initial form state for new items */
const INITIAL_FORM_DATA: InventoryFormData = {
  name: "",
  description: "",
  category: "food",
  price: "",
  costPrice: "",
  quantity: "",
  minStockThreshold: "10",
};

export default function InventoryManagement({
  theme,
}: InventoryManagementProps) {
  // === State ===
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"name" | "category">("name");

  // Filter state
  const [filter, setFilter] = useState<"all" | InventoryStatus>("all");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] =
    useState<InventoryFormData>(INITIAL_FORM_DATA);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [formData, setFormData] =
    useState<InventoryFormData>(INITIAL_FORM_DATA);
  const [formLoading, setFormLoading] = useState(false);

  // === Data Fetching ===
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventory", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();
      setItems(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // === Filtering ===
  const filteredItems = items
    // Stock filter
    .filter((item) => {
      if (filter === "all") return true;
      return item.status === filter;
    })
    // Search filter
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    // Alphabetical sorting
    .sort((a, b) => {
      const A = a[sortField].toLowerCase();
      const B = b[sortField].toLowerCase();
      return A.localeCompare(B);
    });

  // === Status Badge Styling ===
  const getStatusClass = (status: InventoryStatus): string => {
    switch (status) {
      case "in stock":
        return styles.statusInStock;
      case "low stock":
        return styles.statusLowStock;
      case "out of stock":
        return styles.statusOutOfStock;
      default:
        return "";
    }
  };

  // === Inline Editing ===
  const startEditing = (item: InventoryItem) => {
    // Set the editing state with current item values
    // Handle potential undefined/null values from Firestore
    // Also handle legacy field name 'minStock' for backward compatibility
    const itemData = item as InventoryItem & { minStock?: number };
    const minStockValue = item.minStockThreshold ?? itemData.minStock ?? 10;

    const newEditData: InventoryFormData = {
      name: item.name || "",
      description: item.description || "",
      category: item.category || "food",
      price: (item.price ?? 0).toString(),
      costPrice: (item.costPrice ?? 0).toString(),
      quantity: (item.quantity ?? 0).toString(),
      minStockThreshold: minStockValue.toString(),
    };
    setEditingId(item.id);
    setEditData(newEditData);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData(INITIAL_FORM_DATA);
  };

  const saveEditing = async () => {
    if (!editingId) return;

    try {
      const response = await fetch(`/api/inventory/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editData.name.trim(),
          description: editData.description.trim(),
          category: editData.category,
          price: parseFloat(editData.price) || 0,
          costPrice: parseFloat(editData.costPrice) || 0,
          quantity: parseInt(editData.quantity) || 0,
          minStockThreshold: parseInt(editData.minStockThreshold) || 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update item");
      }

      setSuccess("Item updated successfully");
      setTimeout(() => setSuccess(null), 3000);
      setEditingId(null);
      setEditData(INITIAL_FORM_DATA);
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
      setTimeout(() => setError(null), 5000);
    }
  };

  // === Add Item ===
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setError("Item name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      setError("Valid price is required");
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      setError("Valid quantity is required");
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          price: parseFloat(formData.price),
          costPrice: parseFloat(formData.costPrice) || 0,
          quantity: parseInt(formData.quantity),
          minStock: parseInt(formData.minStockThreshold) || 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add item");
      }

      setSuccess("Item added successfully");
      setTimeout(() => setSuccess(null), 3000);
      setShowAddModal(false);
      setFormData(INITIAL_FORM_DATA);
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      setTimeout(() => setError(null), 5000);
    } finally {
      setFormLoading(false);
    }
  };

  // === Delete Item ===
  const confirmDelete = (item: InventoryItem) => {
    setDeleteTarget(item);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/inventory/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete item");
      }

      setSuccess("Item deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
      setTimeout(() => setError(null), 5000);
    } finally {
      setFormLoading(false);
    }
  };

  // === Theme-based classes ===
  const themeClasses = {
    filterButton:
      theme === "blue" ? styles.filterButtonBlue : styles.filterButtonGreen,
    addButton: theme === "blue" ? styles.addButtonBlue : styles.addButtonGreen,
    cellInput: theme === "green" ? styles.cellInputGreen : "",
    cellSelect: theme === "green" ? styles.cellSelectGreen : "",
    formInput: theme === "green" ? styles.formInputGreen : "",
    modalSubmit:
      theme === "blue"
        ? styles.modalSubmitButtonBlue
        : styles.modalSubmitButtonGreen,
  };

  // === Render ===
  if (loading) {
    return <div className={styles.loading}>Loading inventory...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Messages */}
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Inventory Management</h1>
        <button
          className={`${styles.addButton} ${themeClasses.addButton}`}
          onClick={() => setShowAddModal(true)}
        >
          + Add Item
        </button>
      </div>

      {/*Search and Sort */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as "name" | "category")}
          className={styles.filterSelect}
        >
          <option value="name">Sort by Name (A–Z)</option>
          <option value="category">Sort by Category (A–Z)</option>
        </select>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            className={`${styles.filterButton} ${themeClasses.filterButton} ${
              filter === option ? styles.active : ""
            }`}
            onClick={() => setFilter(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price (JMD)</th>
                <th>Cost (JMD)</th>
                <th>Quantity</th>
                <th>Min Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    No items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    {/* Name */}
                    <td className={styles.editableCell}>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className={`${styles.cellInput} ${themeClasses.cellInput}`}
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                        />
                      ) : (
                        <div>
                          <div className={styles.itemName}>{item.name}</div>
                          {item.description && (
                            <div className={styles.itemDescription}>
                              {item.description}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td
                      className={`${styles.editableCell} ${styles.categoryCell}`}
                    >
                      {editingId === item.id ? (
                        <select
                          className={`${styles.cellSelect} ${themeClasses.cellSelect}`}
                          value={editData.category}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              category: e.target.value,
                            })
                          }
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.category
                      )}
                    </td>

                    {/* Price */}
                    <td
                      className={`${styles.editableCell} ${styles.priceCell}`}
                    >
                      {editingId === item.id ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`${styles.cellInput} ${themeClasses.cellInput}`}
                          value={editData.price}
                          onChange={(e) =>
                            setEditData({ ...editData, price: e.target.value })
                          }
                        />
                      ) : (
                        `$${item.price.toFixed(2)}`
                      )}
                    </td>

                    {/* Cost */}
                    <td
                      className={`${styles.editableCell} ${styles.priceCell}`}
                    >
                      {editingId === item.id ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`${styles.cellInput} ${themeClasses.cellInput}`}
                          value={editData.costPrice}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              costPrice: e.target.value,
                            })
                          }
                        />
                      ) : (
                        `$${item.costPrice.toFixed(2)}`
                      )}
                    </td>

                    {/* Quantity */}
                    <td className={styles.editableCell}>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min="0"
                          className={`${styles.cellInput} ${themeClasses.cellInput}`}
                          value={editData.quantity}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              quantity: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <span
                          className={
                            item.quantity === 0
                              ? styles.quantityWarning
                              : item.quantity <= item.minStockThreshold
                              ? styles.quantityLow
                              : ""
                          }
                        >
                          {item.quantity}
                        </span>
                      )}
                    </td>

                    {/* Min Stock Threshold */}
                    <td className={styles.editableCell}>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min="0"
                          className={`${styles.cellInput} ${themeClasses.cellInput}`}
                          value={editData.minStockThreshold}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              minStockThreshold: e.target.value,
                            })
                          }
                        />
                      ) : (
                        // Handle legacy field name 'minStock' for display
                        item.minStockThreshold ?? (item as any).minStock ?? 10
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actions}>
                        {editingId === item.id ? (
                          <>
                            <button
                              className={`${styles.actionButton} ${styles.saveButton}`}
                              onClick={saveEditing}
                            >
                              Save
                            </button>
                            <button
                              className={`${styles.actionButton} ${styles.cancelEditButton}`}
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`${styles.actionButton} ${styles.editButton}`}
                              onClick={() => startEditing(item)}
                            >
                              Edit
                            </button>
                            <button
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={() => confirmDelete(item)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Item</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className={styles.modalBody}>
                {/* Name */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Item Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.formInput} ${themeClasses.formInput}`}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Chicken Patty"
                    required
                  />
                </div>

                {/* Description */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the item"
                  />
                </div>

                {/* Category */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Category <span>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Row */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Selling Price (JMD) <span>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`${styles.formInput} ${themeClasses.formInput}`}
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="250.00"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cost Price (JMD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`${styles.formInput} ${themeClasses.formInput}`}
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      placeholder="150.00"
                    />
                  </div>
                </div>

                {/* Quantity Row */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Quantity in Stock <span>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`${styles.formInput} ${themeClasses.formInput}`}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="50"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`${styles.formInput} ${themeClasses.formInput}`}
                      value={formData.minStockThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStockThreshold: e.target.value,
                        })
                      }
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelButton}
                  onClick={() => setShowAddModal(false)}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.modalSubmitButton} ${themeClasses.modalSubmit}`}
                  disabled={formLoading}
                >
                  {formLoading ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Confirm Delete</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.deleteModalText}>
                Are you sure you want to delete{" "}
                <span className={styles.deleteModalItemName}>
                  {deleteTarget.name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                className={`${styles.modalSubmitButton} ${styles.deleteConfirmButton}`}
                onClick={handleDelete}
                disabled={formLoading}
              >
                {formLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
