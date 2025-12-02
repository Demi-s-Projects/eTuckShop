/**
 * Auth Context Provider
 * 
 * Provides centralized authentication state management across the application.
 * This eliminates the need for multiple onAuthStateChanged listeners in each component.
 * 
 * Features:
 * - Single Firebase auth listener for the entire app
 * - Consistent user state across all pages
 * - Loading state for initial auth check
 * - User info including uid, displayName, email
 * - Role detection from route or can be extended to use custom claims
 * 
 * Usage:
 * 1. Wrap your app/layout with <AuthProvider>
 * 2. Use the useAuth() hook to access auth state
 * 
 * Example:
 * const { user, loading, isAuthenticated } = useAuth();
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

/** Shape of the authenticated user info */
export interface AuthUser {
    /** Firebase UID */
    uid: string;
    /** User's display name */
    displayName: string;
    /** User's email address */
    email: string | null;
    /** Firebase User object for advanced operations */
    firebaseUser: FirebaseUser;
}

/** Shape of the auth context value */
interface AuthContextType {
    /** Authenticated user info, or null if not authenticated */
    user: AuthUser | null;
    /** Whether the auth state is still being determined */
    loading: boolean;
    /** Convenience boolean for checking if user is authenticated */
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Single auth listener for the entire app
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Map Firebase user to our AuthUser format
                const displayName = 
                    firebaseUser.displayName || 
                    firebaseUser.email?.split("@")[0] || 
                    "User";

                setUser({
                    uid: firebaseUser.uid,
                    displayName,
                    email: firebaseUser.email,
                    firebaseUser,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: user !== null,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

/**
 * Helper function to format user for Dashboard component
 * @param user - AuthUser from context
 * @param role - Role string to display (e.g., "Customer", "Employee", "Owner")
 */
export function formatDashboardUser(user: AuthUser | null, role: string): { name: string; role: string; email?: string } | undefined {
    if (!user) return undefined;
    return {
        name: user.displayName,
        role,
        email: user.email || undefined,
    };
}
