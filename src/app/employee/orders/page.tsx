/**
 * Employee Orders Page
 * 
 * Order management interface for employees to process customer orders.
 * Employees can view all orders, update order status, and manage the order workflow.
 * 
 * Features:
 * - View all orders in the system
 * - Filter orders by status for efficient workflow management
 * - Start preparing orders (pending → in-progress)
 * - Mark orders as completed (in-progress → completed)
 * - Cancel orders when necessary
 * - Acknowledge customer cancellations
 * - Green theme consistent with employee role
 */

"use client";

import Dashboard from "@/components/Dashboard";
import styles from "@/styles/Orders.module.css";
import type { OrderStatus, OrderItem } from "@/types/Order";
import {
    useOrderManagement,
    formatOrderDate,
    getStatusBadgeClass,
    getStatusLabel,
    STAFF_FILTER_STATUSES,
} from "@/hooks/useOrderManagement";

/** User object for Dashboard to display correct sidebar */
const dashboardUser = {
    name: "Employee",
    role: "employee",
};

export default function EmployeeOrdersPage() {
    // Use the shared order management hook
    const {
        loading,
        error,
        filter,
        setFilter,
        updating,
        fetchOrders,
        updateOrderStatus,
        filteredOrders,
    } = useOrderManagement();

    return (
        <Dashboard theme="green" user={dashboardUser}>
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <h1 className={styles.title}>Order Management</h1>
                    <button className={styles.refreshButton} onClick={fetchOrders}>
                        🔄 Refresh
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.filters}>
                    {STAFF_FILTER_STATUSES.map((status) => (
                        <button
                            key={status}
                            className={`${styles.filterButton} ${filter === status ? styles.active : ""}`}
                            onClick={() => setFilter(status)}
                            style={{ "--theme-color": "#10b981" } as React.CSSProperties}
                        >
                            {status === "all" ? "All Orders" : getStatusLabel(status as OrderStatus)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading orders...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className={styles.emptyState}>
                        No orders found{filter !== "all" ? ` with status "${getStatusLabel(filter as OrderStatus)}"` : ""}.
                    </div>
                ) : (
                    <div className={styles.ordersList}>
                        {filteredOrders.map((order) => (
                            <div key={order.OrderID} className={styles.orderCard}>
                                <div className={styles.orderHeader}>
                                    <div className={styles.orderInfo}>
                                        <span className={styles.orderId}>Order #{order.OrderID}</span>
                                        <span className={styles.orderTime}>{formatOrderDate(order.OrderTime)}</span>
                                        <span className={styles.customerName}>Customer: {order.displayName}</span>
                                    </div>
                                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status, styles)}`}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>

                                <div className={styles.orderContents}>
                                    <div className={styles.contentsTitle}>Order Items:</div>
                                    <div className={styles.itemsList}>
                                        {order.OrderContents.map((item: OrderItem, index: number) => (
                                            <div key={index} className={styles.orderItem}>
                                                <span className={styles.itemName}>
                                                    {item.name}
                                                    <span className={styles.itemQuantity}> x{item.quantity}</span>
                                                </span>
                                                <span className={styles.itemPrice}>
                                                    R{(item.priceAtPurchase * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.orderTotal}>
                                    <span className={styles.totalLabel}>Total:</span>
                                    <span className={styles.totalAmount}>R{order.TotalPrice.toFixed(2)}</span>
                                </div>

                                {(order.status === "pending" || order.status === "in-progress" || order.status === "cancelled") && (
                                    <div className={styles.orderActions}>
                                        {order.status === "pending" && (
                                            <>
                                                <button
                                                    className={`${styles.actionButton} ${styles.startButton}`}
                                                    onClick={() => updateOrderStatus(order.OrderID, "in-progress")}
                                                    disabled={updating === order.OrderID}
                                                >
                                                    {updating === order.OrderID ? "Updating..." : "Start Preparing"}
                                                </button>
                                                <button
                                                    className={`${styles.actionButton} ${styles.cancelButton}`}
                                                    onClick={() => updateOrderStatus(order.OrderID, "cancelled")}
                                                    disabled={updating === order.OrderID}
                                                >
                                                    Cancel Order
                                                </button>
                                            </>
                                        )}
                                        {order.status === "in-progress" && (
                                            <>
                                                <button
                                                    className={`${styles.actionButton} ${styles.completeButton}`}
                                                    onClick={() => updateOrderStatus(order.OrderID, "completed")}
                                                    disabled={updating === order.OrderID}
                                                >
                                                    {updating === order.OrderID ? "Updating..." : "Mark Completed"}
                                                </button>
                                                <button
                                                    className={`${styles.actionButton} ${styles.cancelButton}`}
                                                    onClick={() => updateOrderStatus(order.OrderID, "cancelled")}
                                                    disabled={updating === order.OrderID}
                                                >
                                                    Cancel Order
                                                </button>
                                            </>
                                        )}
                                        {order.status === "cancelled" && (
                                            <button
                                                className={`${styles.actionButton} ${styles.acknowledgeButton}`}
                                                onClick={() => updateOrderStatus(order.OrderID, "cancelled-acknowledged")}
                                                disabled={updating === order.OrderID}
                                            >
                                                {updating === order.OrderID ? "Updating..." : "Acknowledge Cancellation"}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Dashboard>
    );
}
