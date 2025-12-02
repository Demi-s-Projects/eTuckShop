/**
 * Customer Home Page
 * 
 * This page serves as the main dashboard for the Customer role.
 * It uses the Dashboard layout component with a red theme.
 * 
 * Features:
 * - Authentication check (via onAuthStateChanged)
 * - Dashboard layout wrapper with red theme
 * - Cart button with badge showing item count
 * - Quick access to menu and orders
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import Dashboard from "@/components/Dashboard";
import { useCart } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import styles from "@/styles/CustomerHome.module.css";

function CustomerHomeContent() {
    // State to store the authenticated user's information
    const [user, setUser] = useState<{name: string, role: string, email?: string} | undefined>(undefined);
    const [userId, setUserId] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>("");
    // State to handle loading status while checking authentication
    const [loading, setLoading] = useState(true);
    // Cart sidebar state
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    // Get cart info
    const { totalItems } = useCart();

    useEffect(() => {
        // Subscribe to authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer';
                // Map Firebase user to Dashboard user format
                setUser({
                    name: name,
                    role: 'Customer',
                    email: firebaseUser.email || undefined
                });
                setUserId(firebaseUser.uid);
                setDisplayName(name);
            } else {
                setUser(undefined);
                setUserId("");
                setDisplayName("");
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
        <Dashboard user={user} theme="red">
            <div className={styles.container}>
                <h1 className={styles.title}>Customer Dashboard</h1>
                <p className={styles.welcomeText}>Welcome back, {user?.name || 'Customer'}!</p>
                
                <div className={styles.overviewCard}>
                    <h2 className={styles.sectionTitle}>Quick Actions</h2>
                    <p className={styles.description}>Browse our menu and place your order.</p>
                    
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Items in Cart</h3>
                            <p className={styles.statValue}>{totalItems}</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Recent Orders</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                        <div className={styles.statCard}>
                            <h3 className={styles.statTitle}>Favorites</h3>
                            <p className={styles.statValue}>0</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <Link href="/customer/menu" className={styles.menuLink}>
                            🍔 Browse Menu & Order
                        </Link>
                    </div>
                </div>
            </div>

            {/* Floating Cart Button */}
            <button
                className={styles.cartButton}
                onClick={() => setIsCartOpen(true)}
            >
                🛒 Cart
                {totalItems > 0 && (
                    <span className={styles.cartBadge}>{totalItems}</span>
                )}
            </button>

            {/* Cart Sidebar */}
            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                userId={userId}
                displayName={displayName}
            />
        </Dashboard>
    );
}

export default function CustomerHome() {
    return <CustomerHomeContent />;
}