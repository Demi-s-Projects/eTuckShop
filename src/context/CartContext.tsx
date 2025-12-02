"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { MenuItem, CartItem } from "@/types/MenuItem";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";

const CART_STORAGE_KEY = "etuckshop_cart";

interface CartContextType {
    items: CartItem[];
    addItem: (item: MenuItem) => void;
    removeItem: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Get stored cart from localStorage for a specific user
 */
function getStoredCart(userId: string): CartItem[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(`${CART_STORAGE_KEY}_${userId}`);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error("Error reading cart from localStorage:", error);
    }
    return [];
}

/**
 * Save cart to localStorage for a specific user
 */
function saveCart(userId: string, items: CartItem[]): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(`${CART_STORAGE_KEY}_${userId}`, JSON.stringify(items));
    } catch (error) {
        console.error("Error saving cart to localStorage:", error);
    }
}

/**
 * Clear cart from localStorage for a specific user
 */
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

    // Listen for auth state changes and load cart for the logged-in user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                // Load cart from localStorage for this user
                const storedCart = getStoredCart(user.uid);
                setItems(storedCart);
            } else {
                // User logged out - clear cart state
                setUserId(null);
                setItems([]);
            }
            setIsInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    // Save cart to localStorage whenever items change (after initialization)
    useEffect(() => {
        if (isInitialized && userId) {
            saveCart(userId, items);
        }
    }, [items, userId, isInitialized]);

    const addItem = useCallback((item: MenuItem) => {
        setItems((prevItems) => {
            const existingItem = prevItems.find((i) => i.id === item.id);
            if (existingItem) {
                // Increment quantity if item already exists
                return prevItems.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            // Add new item with quantity 1
            return [...prevItems, { ...item, quantity: 1 }];
        });
    }, []);

    const removeItem = useCallback((itemId: string) => {
        setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    }, []);

    const updateQuantity = useCallback((itemId: string, quantity: number) => {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
        } else {
            setItems((prevItems) =>
                prevItems.map((item) =>
                    item.id === itemId ? { ...item, quantity } : item
                )
            );
        }
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        // Also clear from localStorage
        if (userId) {
            clearStoredCart(userId);
        }
    }, [userId]);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
