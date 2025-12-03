/**
 * Order Management Hook
 * 
 * A custom hook that encapsulates all order management logic shared across
 * owner, employee, and customer order pages.
 * 
 * Features:
 * - Fetch orders (all orders or filtered by userId)
 * - Update order status
 * - Filter orders by status
 * - Format dates for display
 * - Get status badge CSS classes
 * - Get human-readable status labels
 * 
 * Usage:
 * ```tsx
 * const {
 *   orders,
 *   loading,
 *   error,
 *   filter,
 *   setFilter,
 *   updating,
 *   fetchOrders,
 *   updateOrderStatus,
 *   filteredOrders,
 * } = useOrderManagement({ userId: "optional-user-id" });
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import type { Order, OrderStatus } from "@/types/Order";
import { addNotification } from "@/util/notifications";

/** Filter options including 'all' plus all order statuses */
export type FilterStatus = "all" | OrderStatus;

/** Options for customizing the hook behavior */
interface UseOrderManagementOptions {
    /** If provided, only fetches orders for this user ID */
    userId?: string | null;
    /** Custom status labels (e.g., customer-friendly labels) */
    statusLabels?: Partial<Record<OrderStatus, string>>;
}

/** Return type of the useOrderManagement hook */
interface UseOrderManagementReturn {
    /** Array of all fetched orders */
    orders: Order[];
    /** Whether orders are currently being fetched */
    loading: boolean;
    /** Error message if fetch/update failed */
    error: string | null;
    /** Current filter status */
    filter: FilterStatus;
    /** Set the filter status */
    setFilter: (filter: FilterStatus) => void;
    /** OrderID currently being updated, or null */
    updating: number | null;
    /** Refetch orders from the API */
    fetchOrders: () => Promise<void>;
    /** Update an order's status */
    updateOrderStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>;
    /** Orders filtered by current filter status */
    filteredOrders: Order[];
    /** Clear the current error */
    clearError: () => void;
}

/** Default status labels used across the application */
const DEFAULT_STATUS_LABELS: Record<OrderStatus, string> = {
    "pending": "Pending",
    "in-progress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "cancelled-acknowledged": "Acknowledged",
};

/**
 * Custom hook for order management functionality
 * 
 * @param options - Configuration options for the hook
 * @returns Order management state and functions
 */
export function useOrderManagement(options: UseOrderManagementOptions = {}): UseOrderManagementReturn {
    const { userId, statusLabels = {} } = options;
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>("all");
    const [updating, setUpdating] = useState<number | null>(null);

    /**
     * Fetches orders from the API
     * If userId is provided, only fetches orders for that user
     */
    const fetchOrders = useCallback(async () => {
        // Don't fetch if userId is explicitly required but not yet available
        if (userId === null) return;
        
        try {
            setLoading(true);
            setError(null);
            
            // Build URL with optional userId filter
            const url = userId 
                ? `/api/orders?userId=${userId}`
                : "/api/orders";
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("Failed to fetch orders");
            }
            
            const data = await response.json();
            
            // Sort orders by OrderTime descending (newest first)
            const sortedOrders = (data.orders || []).sort((a: Order, b: Order) => {
                return new Date(b.OrderTime).getTime() - new Date(a.OrderTime).getTime();
            });
            
            setOrders(sortedOrders);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Fetch orders on mount and when userId changes
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    /**
     * Updates an order's status via the API
     * 
     * @param orderId - The OrderID to update
     * @param newStatus - The new status to set
     */

    const updateOrderStatus = useCallback(
    async (orderId: number, newStatus: OrderStatus) => {
        try {
        setUpdating(orderId);

        const response = await fetch("/api/orders", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ OrderID: orderId, status: newStatus }),
        });

        if (!response.ok) {
            throw new Error("Failed to update order");
        }

        // Optimistically update local state
        let updatedOrder: Order | undefined;
        setOrders((prev) =>
            prev.map((order) => {
            if (order.OrderID === orderId) {
                updatedOrder = { ...order, status: newStatus };
                return updatedOrder;
            }
            return order;
            })
        );

        // Notify customer if staff cancelled the order
        if (
            newStatus === "cancelled" &&
            updatedOrder &&
            updatedOrder.userId // assuming your Order type has UserID
        ) {
            await addNotification(
            updatedOrder.userId,
            "order-cancelled",
            `Your order #${updatedOrder.OrderID} has been cancelled by the staff.`
            );
        }

        } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update order");
        } finally {
        setUpdating(null);
        }
    },[]);


    /**
     * Filters orders based on current filter status
     */
    const filteredOrders = orders.filter((order) => {
        if (filter === "all") return true;
        return order.status === filter;
    });

    /**
     * Clears the current error message
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        orders,
        loading,
        error,
        filter,
        setFilter,
        updating,
        fetchOrders,
        updateOrderStatus,
        filteredOrders,
        clearError,
    };
}

// ============================================================================
// Utility Functions (exported separately for use without the hook)
// ============================================================================

/**
 * Formats a date for display
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string using locale settings
 */
export function formatOrderDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString();
}

/**
 * Gets the CSS module class name for a status badge
 * 
 * @param status - The order status
 * @param styles - CSS module styles object
 * @returns The appropriate CSS class name
 */
export function getStatusBadgeClass(
    status: OrderStatus,
    styles: Record<string, string>
): string {
    switch (status) {
        case "pending":
            return styles.statusPending;
        case "in-progress":
            return styles.statusInProgress;
        case "completed":
            return styles.statusCompleted;
        case "cancelled":
            return styles.statusCancelled;
        case "cancelled-acknowledged":
            return styles.statusCancelledAcknowledged;
        default:
            return styles.statusPending;
    }
}

/**
 * Gets a human-readable label for an order status
 * 
 * @param status - The order status
 * @param customLabels - Optional custom labels to override defaults
 * @returns Human-readable status label
 */
export function getStatusLabel(
    status: OrderStatus,
    customLabels?: Partial<Record<OrderStatus, string>>
): string {
    const labels = { ...DEFAULT_STATUS_LABELS, ...customLabels };
    return labels[status] || status;
}

/**
 * Checks if an order can be cancelled by a customer
 * Customers can only cancel pending orders
 * 
 * @param status - The current order status
 * @returns Whether the order can be cancelled
 */
export function canCustomerCancel(status: OrderStatus): boolean {
    return status === "pending";
}

/**
 * All possible filter statuses for staff (owner/employee)
 */
export const STAFF_FILTER_STATUSES: FilterStatus[] = [
    "all",
    "pending",
    "in-progress",
    "completed",
    "cancelled",
    "cancelled-acknowledged",
];

/**
 * Filter statuses shown to customers (excludes acknowledged)
 */
export const CUSTOMER_FILTER_STATUSES: FilterStatus[] = [
    "all",
    "pending",
    "in-progress",
    "completed",
    "cancelled",
];

/**
 * Customer-friendly status labels
 */
export const CUSTOMER_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
    "in-progress": "Preparing",
    "completed": "Ready for Pickup",
    "cancelled-acknowledged": "Cancelled",
};
