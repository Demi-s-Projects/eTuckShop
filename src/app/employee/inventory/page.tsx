/**
 * Employee Inventory Page
 * 
 * Provides inventory management functionality for the Employee role.
 * Uses the Dashboard layout with green theme and the shared
 * InventoryManagement component for spreadsheet-like editing.
 * 
 * Features:
 * - Full CRUD operations on inventory items
 * - Filter by stock status
 * - Inline editing for quick updates
 * - Modal forms for adding new items
 */

"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import Dashboard from "@/components/Dashboard";
import InventoryManagement from "@/components/InventoryManagement";

export default function EmployeeInventoryPage() {
    // State to store the authenticated user's information
    const [user, setUser] = useState<{name: string, role: string, email?: string} | undefined>(undefined);
    // State to handle loading status while checking authentication
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Map Firebase user to Dashboard user format
                setUser({
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Employee',
                    role: 'Employee',
                    email: firebaseUser.email || undefined
                });
            } else {
                setUser(undefined);
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // Show loading state while checking auth
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                color: '#64748b'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <Dashboard user={user} theme="green">
            <InventoryManagement theme="green" />
        </Dashboard>
    );
}
