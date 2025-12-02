/**
 * Client-side Providers
 * 
 * Wraps all client-side context providers for the application.
 * This allows the root layout to remain a server component while
 * still providing client-side contexts.
 * 
 * Providers included:
 * - AuthProvider: Centralized authentication state
 */

"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
