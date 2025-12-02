"use client";

import { useState, useEffect, useCallback } from "react";
import Dashboard from "@/components/Dashboard";
import styles from "@/styles/Orders.module.css";
import type { Order, OrderStatus, OrderItem } from "@/types/Order";

type FilterStatus = "all" | OrderStatus;

export default function OwnerOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>("all");
    const [updating, setUpdating] = useState<number | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch("/api/orders");
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
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
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

            // Update local state
            setOrders((prev) =>
                prev.map((order) =>
                    order.OrderID === orderId ? { ...order, status: newStatus } : order
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update order");
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
                return "In Progress";
            case "completed":
                return "Completed";
            case "cancelled":
                return "Cancelled";
            case "cancelled-acknowledged":
                return "Acknowledged";
            default:
                return status;
        }
    };

    return (
        <Dashboard theme="blue">
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <h1 className={styles.title}>Order Management</h1>
                    <button className={styles.refreshButton} onClick={fetchOrders}>
                        🔄 Refresh
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.filters}>
                    {(["all", "pending", "in-progress", "completed", "cancelled", "cancelled-acknowledged"] as FilterStatus[]).map((status) => (
                        <button
                            key={status}
                            className={`${styles.filterButton} ${filter === status ? styles.active : ""}`}
                            onClick={() => setFilter(status)}
                            style={{ "--theme-color": "#3b82f6" } as React.CSSProperties}
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
                                        <span className={styles.orderTime}>{formatDate(order.OrderTime)}</span>
                                        <span className={styles.customerName}>Customer: {order.displayName}</span>
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
