"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import { authStyles } from "@/app/auth.module";

export default function CustomerHome() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);
        try {
            await auth.signOut();
            router.push("/login");
        } catch (err) {
            console.error("Failed to sign out:", err);
            setLoading(false);
        }
    }

    return (
        <div style={authStyles.container}>
            <h1>Customer Home</h1>
            <div style={{ marginTop: 16 }}>
                <button
                    onClick={handleLogout}
                    disabled={loading}
                    style={{ ...authStyles.button, width: 140 }}
                >
                    {loading ? "Signing out..." : "Logout"}
                </button>
            </div>
        </div>
    );
}