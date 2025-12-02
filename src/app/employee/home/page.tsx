/**
 * Employee Home Page
 * 
 * This page serves as the main dashboard for the Employee role.
 * It uses the Dashboard layout component with a green theme.
 * 
 * Features:
 * - Authentication via centralized AuthContext
 * - Dashboard layout wrapper with green theme
 * - Employee-specific content area
 */

"use client";

import { useAuth, formatDashboardUser } from "@/context/AuthContext";
import Dashboard from "@/components/Dashboard";
import styles from "@/styles/EmployeeHome.module.css";

export default function EmployeeHome() {
    // Get auth state from centralized context
    const { user: authUser, loading } = useAuth();
    
    // Format user for Dashboard component
    const user = formatDashboardUser(authUser, "Employee");

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                Loading...
            </div>
        );
    }

    return (
        <Dashboard user={user} theme="green">
            <div className={styles.container}>
                <h1 className={styles.title}>Employee Dashboard</h1>
                <p className={styles.welcomeText}>Welcome back, {user?.name || 'Employee'}!</p>
                
                <div className={styles.overviewCard}>
                    <h2 className={styles.sectionTitle}>Today&apos;s Overview</h2>
                    <p className={styles.description}>Manage orders and inventory from here.</p>
                    
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Pending Orders</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Completed Today</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Low Stock Alerts</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                    </div>
                </div>
            </div>
        </Dashboard>
    );
}