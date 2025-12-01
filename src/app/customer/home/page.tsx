"use client";
import Link from "next/link";
import styles from "@/styles/Auth.module.css";
import LogoutButton from "@/components/LogoutButton";

export default function CustomerHome() {
    return (
        <div className={styles.container}>
            <h1>Customer Home</h1>
            <p className={styles.description}>
                Welcome to eTuckShop! Browse our menu and place your order.
            </p>
            <div style={{ marginBottom: "16px" }}>
                <Link 
                    href="/customer/menu" 
                    style={{
                        display: "inline-block",
                        padding: "12px 24px",
                        background: "#171717",
                        color: "#fff",
                        borderRadius: "4px",
                        textDecoration: "none",
                        fontWeight: 500,
                    }}
                >
                    🍔 View Menu & Order
                </Link>
            </div>
            <div className={styles.logoutWrapper}>
                <LogoutButton redirectTo="/login" width={140} />
            </div>
        </div>
    );
}