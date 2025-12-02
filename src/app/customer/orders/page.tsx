"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import Dashboard from "@/components/dashboard";
import styles from "@/styles/Orders.module.css";
import type { Order, OrderStatus, OrderItem } from "@/types/Order";

type FilterStatus = "all" | OrderStatus;

export default function CustomerOrdersPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>("all");
    const [updating, setUpdating] = useState<number | null>(null);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            setError(null);
            // Fetch only orders for the current user
            const response = await fetch(`/api/orders?userId=${user.uid}`);
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
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const cancelOrder = async (orderId: number) => {
        try {
            setUpdating(orderId);
            const response = await fetch("/api/orders", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ OrderID: orderId, status: "cancelled" }),
            });

            if (!response.ok) {
                throw new Error("Failed to cancel order");
            }

            // Update local state
            setOrders((prev) =>
                prev.map((order) =>
                    order.OrderID === orderId ? { ...order, status: "cancelled" } : order
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to cancel order");
        } finally {
            setUpdating(null);
        }
    };

    const filteredOrders = orders.filter((order) => {
        if (filter === "all") return true;
        return order.status === filter;
    });

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleString();
    };

    const getStatusBadgeClass = (status: OrderStatus) => {
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
    };

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case "pending":
                return "Pending";
            case "in-progress":
                return "Preparing";
            case "completed":
                return "Ready for Pickup";
            case "cancelled":
                return "Cancelled";
            case "cancelled-acknowledged":
                return "Cancelled";
            default:
                return status;
        }
    };

    const canCancel = (status: OrderStatus) => {
        // Customers can only cancel pending orders
        return status === "pending";
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
        role: 'customer',
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
                    {(["all", "pending", "in-progress", "completed", "cancelled"] as FilterStatus[]).map((status) => (
                        <button
                            key={status}
                            className={`${styles.filterButton} ${filter === status ? styles.active : ""}`}
                            onClick={() => setFilter(status)}
                            style={{ "--theme-color": "#ef4444" } as React.CSSProperties}
                        >
                            {status === "all" ? "All Orders" : getStatusLabel(status as OrderStatus)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading your orders...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className={styles.emptyState}>
                        {filter === "all" 
                            ? "You haven't placed any orders yet." 
                            : `No orders with status "${getStatusLabel(filter as OrderStatus)}".`}
                    </div>
                ) : (
                    <div className={styles.ordersList}>
                        {filteredOrders.map((order) => (
                            <div key={order.OrderID} className={styles.orderCard}>
                                <div className={styles.orderHeader}>
                                    <div className={styles.orderInfo}>
                                        <span className={styles.orderId}>Order #{order.OrderID}</span>
                                        <span className={styles.orderTime}>{formatDate(order.OrderTime)}</span>
                                    </div>
                                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>
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

                                {canCancel(order.status) && (
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
                                    <div className={styles.orderActions} style={{ background: "#fef3c7", borderTop: "1px solid #fbbf24" }}>
                                        <span style={{ color: "#92400e", fontWeight: 500 }}>
                                            🍳 Your order is being prepared!
                                        </span>
                                    </div>
                                )}

                                {order.status === "completed" && (
                                    <div className={styles.orderActions} style={{ background: "#d1fae5", borderTop: "1px solid #10b981" }}>
                                        <span style={{ color: "#065f46", fontWeight: 500 }}>
                                            ✅ Your order is ready for pickup!
                                        </span>
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
