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

	async function handleLogout() {
		setLoading(true);
		try {
			await auth.signOut();
			await fetch("/api/session", {
				method: "DELETE",
			});
			router.replace(redirectTo);
		} catch (err) {
			console.error("Failed to sign out:", err);
			setLoading(false);
		}
	}

	return (
		<button onClick={handleLogout} disabled={loading} style={{ ...authStyles.button, width: width ?? 140 }}>
			{loading ? "Signing out..." : "Logout"}
		</button>
	);
}
