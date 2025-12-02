/**
 * Owner Home Page
 * 
 * This page serves as the main dashboard for the Owner role.
 * It uses the Dashboard layout component to provide navigation and a top bar.
 * 
 * Features:
 * - Authentication via centralized AuthContext
 * - Dashboard layout wrapper
 * - Owner-specific content area
 */

"use client";

import { useAuth, formatDashboardUser } from "@/context/AuthContext";
import Dashboard from "@/components/Dashboard";
import styles from "@/styles/OwnerHome.module.css";

export default function OwnerHome() {
    // Get auth state from centralized context
    const { user: authUser, loading } = useAuth();
    
    // Format user for Dashboard component
    const user = formatDashboardUser(authUser, "Owner");

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                Loading...
            </div>
        );
    }

    return (
        <Dashboard user={user} theme="blue">
            <div className={styles.container}>
                <h1 className={styles.title}>Owner Dashboard</h1>
                <p className={styles.welcomeText}>Welcome back, {user?.name || 'Owner'}!</p>
                
                <div className={styles.overviewCard}>
                    <h2 className={styles.sectionTitle}>Overview</h2>
                    <p className={styles.description}>Here you can manage your tuck shop, view reports, and manage users.</p>
                    {/* Placeholder for future dashboard widgets */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Total Sales</h3>
                            <p className={styles.statValue}>R 0.00</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Active Orders</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Low Stock Items</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                    </div>
                </div>
            </div>
        </Dashboard>
    );
}