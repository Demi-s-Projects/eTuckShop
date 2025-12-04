/**
 * Cart Sidebar Component
 * 
 * A sliding sidebar panel that displays the customer's shopping cart.
 * Allows customers to review items, adjust quantities, and proceed to checkout.
 * 
 * Features:
 * - Displays all items currently in the cart
 * - Quantity adjustment (increase/decrease) for each item
 * - Remove individual items from cart
 * - Shows running total price
 * - Proceeds to billing page for payment (order created after payment)
 * - Overlay background that closes sidebar when clicked
 * 
 * Props:
 * - isOpen: Controls sidebar visibility
 * - onClose: Callback to close the sidebar
 * - userId: Firebase Auth UID for order association
 * - displayName: Customer's display name for the order
 */

"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import styles from "@/styles/Menu.module.css";

interface CartSidebarProps {
    /** Whether the sidebar is currently visible */
    isOpen: boolean;
    /** Callback function to close the sidebar */
    onClose: () => void;
    /** Firebase Auth UID of the current user */
    userId: string;
    /** Display name of the current user for the order */
    displayName: string;
}

export default function CartSidebar({ isOpen, onClose, userId, displayName }: CartSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
    const [cartCleared, setCartCleared] = useState(false);
    const [orderError, setOrderError] = useState("");

    // Clear error when cart is modified (item removed, quantity changed, or cart cleared)
    const handleUpdateQuantity = (itemId: string, quantity: number) => {
        setOrderError("");
        updateQuantity(itemId, quantity);
    };

    const handleRemoveItem = (itemId: string) => {
        setOrderError("");
        removeItem(itemId);
    };

    const handleClearCart = () => {
        setOrderError("");
        clearCart();
        setCartCleared(true);
        setTimeout(() => setCartCleared(false), 2000);
    };

    const handleCheckout = () => {
        if (items.length === 0) return;

        // Store checkout data in sessionStorage for the billing page
        const checkoutData = {
            userId,
            displayName,
            items: items.map((item) => ({
                itemId: item.id,
                name: item.name,
                quantity: item.quantity,
                priceAtPurchase: item.price,
            })),
            totalPrice,
            returnPath: pathname, // Store current path to return after payment
        };
        
        sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));
        
        // Navigate to billing page - cart remains intact until payment is confirmed
        onClose();
        router.push("/customer/billing");
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
                    {cartCleared && (
                        <div className={styles.successMessage}>
                            Cart cleared!
                        </div>
                    )}
                    {orderError && (
                        <div className={styles.errorMessage}>{orderError}</div>
                    )}

                    {items.length === 0 ? (
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
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    >
                                        -
                                    </button>
                                    <span className={styles.quantity}>{item.quantity}</span>
                                    <button
                                        className={styles.quantityButton}
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    >
                                        +
                                    </button>
                                    <button
                                        className={styles.removeButton}
                                        onClick={() => handleRemoveItem(item.id)}
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
                        disabled={items.length === 0}
                    >
                        Proceed to Checkout
                    </button>
                    {items.length > 0 && (
                        <button
                            className={styles.clearButton}
                            onClick={handleClearCart}
                        >
                            Clear Cart
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
