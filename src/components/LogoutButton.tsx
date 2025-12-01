"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import { authStyles } from "@/app/auth.module";

type Props = {
	redirectTo?: string;
	width?: number | string;
};

export default function LogoutButton({ redirectTo = "/login", width }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [logoutError, setLogoutError] = useState(""); //error alert handling

	async function handleLogout() {
		setLoading(true);
		setLogoutError("");
		try {
			await auth.signOut(); // logs out of the firebase client sessoin
			await fetch("/api/session", {
				method: "DELETE",
			}); //gets rid of the session cookie that keeps you logged in
			router.replace(redirectTo);
		} catch (err) {
			console.error("Failed to sign out:", err);
			setLogoutError("Failed to sign out");
			setLoading(false);
		}
	}

	return (
		<>
			{logoutError && <div style={authStyles.errorMEssage}>{logoutError}</div>}
			<button onClick={handleLogout} disabled={loading} style={{ ...authStyles.button, width: width ?? 140 }}>
				{loading ? "Signing out..." : "Logout"}
			</button>
		</>
	);
}
