"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { OrderItem } from "@/types/Order";
import styles from "@/styles/Menu.module.css";

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    displayName: string;
}

export default function CartSidebar({ isOpen, onClose, userId, displayName }: CartSidebarProps) {
    const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderError, setOrderError] = useState("");

    const handleCheckout = async () => {
        if (items.length === 0) return;

        setIsSubmitting(true);
        setOrderError("");
        setOrderSuccess(false);

        try {
            // Format order contents as structured OrderItem array
            const orderContents: OrderItem[] = items.map((item) => ({
                itemId: item.id,
                name: item.name,
                quantity: item.quantity,
                priceAtPurchase: item.price,
            }));

            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: userId,
                    displayName: displayName,
                    OrderContents: orderContents,
                    TotalPrice: totalPrice,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to place order");
            }

            const result = await response.json();
            console.log("Order placed successfully:", result);

            setOrderSuccess(true);
            clearCart();

            // Close sidebar after a delay
            setTimeout(() => {
                setOrderSuccess(false);
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Error placing order:", error);
            setOrderError(error instanceof Error ? error.message : "Failed to place order");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.cartOverlay} onClick={onClose} />
            <div className={styles.cartSidebar}>
                <div className={styles.cartHeader}>
                    <h2 className={styles.cartTitle}>Your Cart</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.cartItems}>
                    {orderSuccess && (
                        <div className={styles.successMessage}>
                            Order placed successfully! 🎉
                        </div>
                    )}
                    {orderError && (
                        <div className={styles.errorMessage}>{orderError}</div>
                    )}

                    {items.length === 0 && !orderSuccess ? (
                        <div className={styles.emptyCart}>
                            <p>Your cart is empty</p>
                            <p>Add some items from the menu!</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className={styles.cartItem}>
                                <div className={styles.cartItemInfo}>
                                    <div className={styles.cartItemName}>{item.name}</div>
                                    <div className={styles.cartItemPrice}>
                                        ${item.price.toFixed(2)} each
                                    </div>
                                </div>
                                <div className={styles.cartItemControls}>
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                        -
                                    </button>
                                    <span className={styles.quantity}>{item.quantity}</span>
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        +
                                    </button>
                                    <button
                                        className={styles.removeButton}
                                        onClick={() => removeItem(item.id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className={styles.cartFooter}>
                    <div className={styles.cartTotal}>
                        <span className={styles.totalLabel}>Total:</span>
                        <span className={styles.totalAmount}>${totalPrice.toFixed(2)}</span>
                    </div>
                    <button
                        className={styles.checkoutButton}
                        onClick={handleCheckout}
                        disabled={items.length === 0 || isSubmitting}
                    >
                        {isSubmitting ? "Placing Order..." : "Place Order"}
                    </button>
                    {items.length > 0 && (
                        <button
                            className={styles.clearButton}
                            onClick={clearCart}
                            disabled={isSubmitting}
                        >
                            Clear Cart
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
