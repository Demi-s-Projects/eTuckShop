/**
 * Customer Layout
 * 
 * Wraps all customer pages with providers to ensure
 * state is shared and persisted across page navigations.
 * 
 * Providers:
 * - CartProvider: Shopping cart state
 * - MenuProvider: Cached menu items (prevents reload on navigation)
 */

"use client";

import { CartProvider } from "@/context/CartContext";
import { MenuProvider } from "@/context/MenuContext";
import { ReactNode } from "react";

export default function CustomerLayout({ children }: { children: ReactNode }) {
    return (
        <CartProvider>
            <MenuProvider>
                {children}
            </MenuProvider>
        </CartProvider>
    );
}
