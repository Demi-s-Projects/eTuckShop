"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { MenuItem, CartItem } from "@/types/MenuItem";

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

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

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
    }, []);

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
