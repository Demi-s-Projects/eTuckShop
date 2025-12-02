/**
 * Customer Layout
 * 
 * Wraps all customer pages with the CartProvider to ensure
 * cart state is shared and persisted across page navigations.
 */

"use client";

import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export default function CustomerLayout({ children }: { children: ReactNode }) {
    return (
        <NotificationProvider>
            <CartProvider>
                {/* Global toast notifications */}
                <Toaster position="top-center" />
                {children}
            </CartProvider>
        </NotificationProvider>
    );
}
