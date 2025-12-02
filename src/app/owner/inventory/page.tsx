/**
 * Owner Inventory Page
 * 
 * Provides inventory management functionality for the Owner role.
 * Uses the Dashboard layout with blue theme and the shared
 * InventoryManagement component for spreadsheet-like editing.
 * 
 * Features:
 * - Full CRUD operations on inventory items
 * - Filter by stock status
 * - Inline editing for quick updates
 * - Modal forms for adding new items
 */

"use client";

import { useAuth, formatDashboardUser } from "@/context/AuthContext";
import Dashboard from "@/components/Dashboard";
import InventoryManagement from "@/components/InventoryManagement";

export default function OwnerInventoryPage() {
    // Get auth state from centralized context
    const { user: authUser, loading } = useAuth();
    
    // Format user for Dashboard component
    const user = formatDashboardUser(authUser, "Owner");

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
        <Dashboard user={user} theme="blue">
            <InventoryManagement theme="blue" />
        </Dashboard>
    );
}
