/**
 * Owner Home Page
 * 
 * This page serves as the main dashboard for the Owner role.
 * It uses the Dashboard layout component to provide navigation and a top bar.
 * 
 * Features:
 * - Authentication check (via onAuthStateChanged)
 * - Dashboard layout wrapper
 * - Owner-specific content area
 */

"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import Dashboard from "@/components/Dashboard";
import styles from "@/styles/OwnerHome.module.css";

export default function OwnerHome() {
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
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Owner',
                    role: 'Owner', // Role is hardcoded for this specific page
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