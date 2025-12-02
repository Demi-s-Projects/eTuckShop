/**
 * Customer Layout
 * 
 * Wraps all customer pages with the CartProvider to ensure
 * cart state is shared and persisted across page navigations.
 */

"use client";

import { CartProvider } from "@/context/CartContext";
import { ReactNode } from "react";

export default function CustomerLayout({ children }: { children: ReactNode }) {
    return (
        <CartProvider>
            {children}
        </CartProvider>
    );
}
