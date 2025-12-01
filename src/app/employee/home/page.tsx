"use client";
import { authStyles } from "@/app/auth.module";
import LogoutButton from "@/components/LogoutButton";

export default function EmployeeHome() {
    return (
        <div style={authStyles.container}>
            <h1>Employee Home</h1>
            <div style={{ marginTop: 16 }}>
                <LogoutButton redirectTo="/login" width={140} />
            </div>
        </div>
    );
}