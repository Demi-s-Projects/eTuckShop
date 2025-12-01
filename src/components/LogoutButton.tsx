"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import styles from "@/styles/Auth.module.css";

type Props = {
	redirectTo?: string;
	width?: number | string;
	className?: string;
};

export default function LogoutButton({ redirectTo = "/login", width, className }: Props) {
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

	// If className is provided, we rely on it for styling and only apply width.
	// Otherwise, we use the default styles.button.
	const buttonClass = className || styles.button;
	const buttonStyle = { width: width ?? 140 };

	return (
		<>
			{logoutError && <div className={styles.errorMessage}>{logoutError}</div>}
			<button 
				onClick={handleLogout} 
				disabled={loading} 
				className={buttonClass}
				style={buttonStyle}
			>
				{loading ? "Signing out..." : "Logout"}
			</button>
		</>
	);
}
