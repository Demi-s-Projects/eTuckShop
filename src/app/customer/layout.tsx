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
import { NotificationProvider } from "@/context/NotificationContext";
import { MenuProvider } from "@/context/MenuContext";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export default function CustomerLayout({ children }: { children: ReactNode }) {
    return (
        <NotificationProvider>
            <CartProvider>
                {/* Global toast notifications */}
                <Toaster position="top-center" />
            <MenuProvider>
                {children}
            </MenuProvider>
            </CartProvider>
        </NotificationProvider>
    );
}
