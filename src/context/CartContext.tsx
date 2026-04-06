/**
 * Cart Context Provider
 * 
 * Provides global cart state management across the customer-facing application.
 * Persists cart data in localStorage tied to the authenticated user's ID.
 * 
 * Features:
 * - Add items to cart (increments quantity if already exists)
 * - Remove items from cart
 * - Update item quantities
 * - Clear entire cart (on checkout or logout)
 * - Automatic persistence to localStorage per user
 * - Cart state restoration on page refresh
 * - Computed totals (item count and price)
 * - Basic toast notifications for add/remove/clear actions
 * 
 * Usage:
 * 1. Wrap your component tree with <CartProvider>
 * 2. Use the useCart() hook to access cart state and actions
 */

"use client";
import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import type { MenuItem, CartItem } from "@/types/MenuItem";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-hot-toast";
import { CartStateManager } from "@/state-managers/cart/CartStateManager";

const CART_STORAGE_KEY = "etuckshop_cart";

interface CartContextType {
    items: CartItem[];
    addItem: (item: MenuItem) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: (silent?: boolean) => void;
    totalItems: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getStoredCart(userId: string): CartItem[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(`${CART_STORAGE_KEY}_${userId}`);
        if (stored) return JSON.parse(stored);
    } catch (error) {
        console.error("Error reading cart from localStorage:", error);
    }
    return [];
}

function saveCart(userId: string, items: CartItem[]): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(`${CART_STORAGE_KEY}_${userId}`, JSON.stringify(items));
    } catch (error) {
        console.error("Error saving cart to localStorage:", error);
    }
}

function clearStoredCart(userId: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(`${CART_STORAGE_KEY}_${userId}`);
    } catch (error) {
        console.error("Error clearing cart from localStorage:", error);
    }
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const cartManager = useMemo(() => new CartStateManager(), []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                const storedCart = getStoredCart(user.uid);
                setItems(storedCart);
            } else {
                setUserId(null);
                setItems([]);
            }
            setIsInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isInitialized && userId) {
            saveCart(userId, items);
        }
    }, [items, userId, isInitialized]);

    const addItem = useCallback((item: MenuItem) => {
        const result = cartManager.addItem(items, item);
        setItems(result.items);

        if (result.action === "added") toast.success(`${item.name} added to cart!`);
        else toast.success(`Increased quantity of ${item.name} in cart!`);
    }, [cartManager, items]);

    const removeItem = useCallback((itemId: string) => {
        const result = cartManager.removeItem(items, itemId);
        setItems(result.items);

        if (result.removedItemName) toast.error(`${result.removedItemName} removed from cart!`);
    }, [cartManager, items]);

    const updateQuantity = useCallback((itemId: string, quantity: number) => {
        const result = cartManager.updateQuantity(items, itemId, quantity);
        setItems(result.items);
        if (result.removedItemName) toast.error(`${result.removedItemName} removed from cart!`);
    }, [cartManager, items]);

    const clearCart = useCallback((silent?: boolean) => {
        setItems([]);
        if (userId) clearStoredCart(userId);
        if (!silent) toast.error(`Cart cleared!`);
    }, [userId]);

    // Memoize derived values to prevent recalculation on every render
    const totalItems = useMemo(() => 
        cartManager.totalItems(items), 
        [cartManager, items]
    );
    const totalPrice = useMemo(() => 
        cartManager.totalPrice(items), 
        [cartManager, items]
    );

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                totalItems,
                totalPrice,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
