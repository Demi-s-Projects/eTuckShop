"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSignInWithEmailAndPassword, useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/config";

import { authStyles } from "@/app/auth.module";

export default function CustomerLogin() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [signInWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);
	// watch auth state so we can redirect if already signed in
	const [currentUser, authLoading, _authError] = useAuthState(auth);
	// reference _authError to avoid unused-variable lint warnings
	void _authError;

	useEffect(() => {
		let mounted = true;
		async function checkAndRedirect() {
			if (!mounted) return;
			if (!authLoading && currentUser) {
				try {
					const tokenResult = await currentUser.getIdTokenResult(true);
					const role = tokenResult.claims.role;
					if (role === "customer") router.push("/customer/home");
					else if (role === "owner") router.push("/owner/home");
				} catch (err) {
					console.error("Error checking user claims:", err);
					await auth.signOut();
				}
			}
		}
		checkAndRedirect();
		return () => {
			mounted = false;
		};
	}, [currentUser, authLoading, router]);
	const [signupError, setSignupError] = useState("");

	async function handleLogin(e: FormEvent) {
		e.preventDefault();
		setSignupError("");
		try {
			//check if already logged in then take them here
			const UserCred = await signInWithEmailAndPassword(email, password);
			const user = UserCred?.user;
			if (!user) throw new Error("Failed to login user");

			const tokenResult = await user.getIdTokenResult(true);
			const role = tokenResult.claims.role;

			if (role === "customer") {
				router.push("/customer/home");
			} else if (role === "owner") {
				router.push("/owner/home");
			}else{
				throw new Error
			}
			setEmail("");
			setPassword("");
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An error occurred during sign up";
			await auth.signOut();
			setSignupError(errorMessage);
			console.error(err);
		}
	}

	return (
		<div style={authStyles.container}>
			<h1 style={authStyles.title}>Login</h1>
			{authLoading ? (
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
					<div style={{ width: 48, height: 48, border: '4px solid #f0f0f0', borderTop: '4px solid #171717', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
					<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
				</div>
			) : (
				<>
					{signupError && <div style={authStyles.errorMEssage}>{signupError}</div>}
					<form onSubmit={handleLogin}>
				<div style={authStyles.formGroup}>
					<label htmlFor="email" style={authStyles.label}>
						Email
					</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						style={authStyles.input}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<div style={authStyles.formGroupLast}>
					<label htmlFor="password" style={authStyles.label}>
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						style={authStyles.input}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<button
					type="submit"
					style={{
						...authStyles.button,
						opacity: authLoading ? 0.6 : 1,
						cursor: authLoading ? 'not-allowed' : 'pointer',
					}}
					disabled={authLoading}
				>
					Login
				</button>
			</form>
			<div style={authStyles.linkContainer}>
				<Link href="/register">Don&apos;t have an account? Sign Up</Link>
			</div>
			</>
			)}
		</div>
	);
}
