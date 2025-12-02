/**
 * Customer Orders Page
 * 
 * Displays the order history for the currently logged-in customer.
 * Customers can view their orders, filter by status, and cancel pending orders.
 * 
 * Features:
 * - View all orders placed by the customer
 * - Filter orders by status (pending, preparing, completed, cancelled)
 * - Cancel pending orders (before preparation begins)
 * - Real-time status updates with visual feedback
 * - Responsive order cards with item details and totals
 */

"use client";

import { useState, useEffect } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import Dashboard from "@/components/Dashboard";
import styles from "@/styles/Orders.module.css";
import type { OrderStatus, OrderItem } from "@/types/Order";
import {
    useOrderManagement,
    formatOrderDate,
    getStatusBadgeClass,
    getStatusLabel,
    canCustomerCancel,
    CUSTOMER_FILTER_STATUSES,
    CUSTOMER_STATUS_LABELS,
} from "@/hooks/useOrderManagement";

export default function CustomerOrdersPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Use the shared order management hook with userId filter
    const {
        loading,
        error,
        filter,
        setFilter,
        updating,
        fetchOrders,
        updateOrderStatus,
        filteredOrders,
    } = useOrderManagement({ userId: user?.uid || null });

    /**
     * Cancel an order (wrapper around updateOrderStatus)
     */
    const cancelOrder = (orderId: number) => {
        updateOrderStatus(orderId, "cancelled");
    };

    /**
     * Get customer-friendly status label
     */
    const getCustomerStatusLabel = (status: OrderStatus) => {
        return getStatusLabel(status, CUSTOMER_STATUS_LABELS);
    };

    if (authLoading) {
        return (
            <Dashboard theme="red" user={{ name: "Loading...", role: "customer" }}>
                <div className={styles.container}>
                    <div className={styles.loading}>Loading...</div>
                </div>
            </Dashboard>
        );
    }

    if (!user) {
        return (
            <Dashboard theme="red" user={{ name: "Guest", role: "customer" }}>
                <div className={styles.container}>
                    <div className={styles.loading}>Please log in to view your orders.</div>
                </div>
            </Dashboard>
        );
    }

    // Create user object for Dashboard
    const dashboardUser = {
        name: user.displayName || user.email?.split('@')[0] || 'Customer',
        role: 'Customer',
        email: user.email || undefined
    };

    return (
        <Dashboard theme="red" user={dashboardUser}>
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <h1 className={styles.title}>My Orders</h1>
                    <button className={styles.refreshButton} onClick={fetchOrders}>
                        🔄 Refresh
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.filters}>
                    {CUSTOMER_FILTER_STATUSES.map((status) => (
                        <button
                            key={status}
                            className={`${styles.filterButton} ${styles.filterButtonRed} ${filter === status ? styles.active : ""}`}
                            onClick={() => setFilter(status)}
                        >
                            {status === "all" ? "All Orders" : getCustomerStatusLabel(status as OrderStatus)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading your orders...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className={styles.emptyState}>
                        {filter === "all" 
                            ? "You haven't placed any orders yet." 
                            : `No orders with status "${getCustomerStatusLabel(filter as OrderStatus)}".`}
                    </div>
                ) : (
                    <div className={styles.ordersList}>
                        {filteredOrders.map((order) => (
                            <div key={order.OrderID} className={styles.orderCard}>
                                <div className={styles.orderHeader}>
                                    <div className={styles.orderInfo}>
                                        <span className={styles.orderId}>Order #{order.OrderID}</span>
                                        <span className={styles.orderTime}>{formatOrderDate(order.OrderTime)}</span>
                                    </div>
                                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status, styles)}`}>
                                        {getCustomerStatusLabel(order.status)}
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

                                {canCustomerCancel(order.status) && (
                                    <div className={`${styles.orderActions} ${styles.customerActions}`}>
                                        <button
                                            className={`${styles.actionButton} ${styles.cancelButton}`}
                                            onClick={() => cancelOrder(order.OrderID)}
                                            disabled={updating === order.OrderID}
                                        >
                                            {updating === order.OrderID ? "Cancelling..." : "Cancel Order"}
                                        </button>
                                    </div>
                                )}

                                {order.status === "in-progress" && (
                                    <div className={`${styles.orderActions} ${styles.statusMessagePreparing}`}>
                                        <span>🍳 Your order is being prepared!</span>
                                    </div>
                                )}

                                {order.status === "completed" && (
                                    <div className={`${styles.orderActions} ${styles.statusMessageReady}`}>
                                        <span>✅ Your order is ready for pickup!</span>
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
