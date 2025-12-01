"use client";
import styles from "@/styles/Auth.module.css";
import LogoutButton from "@/components/LogoutButton";

export default function CustomerHome() {
    return (
        <div className={styles.container}>
            <h1>Customer Home</h1>
            <div className={styles.logoutWrapper}>
                <LogoutButton redirectTo="/login" width={140} />
            </div>
        </div>
    );
}