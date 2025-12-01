"use client";
import { authStyles } from "@/app/auth.module";
import LogoutButton from "@/components/LogoutButton";

export default function OwnerHome() {
    return (
        <div style={authStyles.container}>
            <h1>Owner Home</h1>
            <div style={{ marginTop: 16 }}>
                <LogoutButton redirectTo="/login" width={140} />
            </div>
        </div>
    );
}