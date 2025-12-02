"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSignInWithEmailAndPassword, useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/config";
import { VALID_ROLES } from "@/util/consts";

import styles from "@/styles/Auth.module.css";

// Customer login page - Signs client in with email and password and
// exchanges the user token for a server session cookie, then redirects
export default function CustomerLogin() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	// Firebase sign-in helper from react-firebase-hooks
	const [signInWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);

	// error alerts
	const [loginError, setLoginError] = useState("");

	// Watch global auth state so we can detect if the user is already
	// signed in and redirect appropriately
	const [currentUser, authLoading, _authError] = useAuthState(auth);
	// Use `void` to acknowledge the unused `_authError` so typescript doesnt shoot me
	void _authError;

	// When auth state settles, check the user's custom claims and
	// redirect them to the correct home page. We guard with a `mounted`
	// flag to avoid performing navigation after the component unmounts.
	useEffect(() => {
		let mounted = true;
		async function checkAndRedirect() {
			if (!mounted) return; // bail out when component unmounts
			if (!authLoading && currentUser) {
				try {
					// force-refresh token so we get latest custom claims
					const tokenResult = await currentUser.getIdTokenResult(true);
					const role = tokenResult.claims.role as string | undefined;
					if (role && VALID_ROLES.includes(role)) {
						// Route to role-specific home (e.g. /owner/home, /customer/home)
						router.replace(`/${role}/home`);
					} else {
						throw new Error("Invalid user type found");
					}
				} catch (err) {
					// If anything goes wrong reading claims, sign the client out
					// to ensure we don't leave a partially-authenticated UI state.
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

	async function handleLogin(e: FormEvent) {
		e.preventDefault();

		// Clear any previous error shown to the user
		setLoginError("");

		try {
			// Sign in with Firebase client SDK using email/password
			const UserCred = await signInWithEmailAndPassword(email, password);
			const user = UserCred?.user;
			if (!user) throw new Error("Failed to login user");

			// Obtain the role from the user token
			const token = await user.getIdToken(true);
			const tokenResult = await user.getIdTokenResult(true);
			const role = tokenResult.claims.role as string|undefined;

			// Exchange the ID token for a server created session cookie
			const sessionRes = await fetch("/api/session", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ token }),
			});

			if (!sessionRes.ok) {
				// If the backend failed to create a session, abort the flow
				throw new Error("Failed to create session");
			}

			// Redirect the user based on their role 
			if (role && VALID_ROLES.includes(role)) {
				router.replace(`/${role}/home`);
			} else {
				throw new Error("Invalid user type found");
			}

			setEmail("");
			setPassword("");
		} catch (err) {
			// On failure: attempt to clean up any partially authenticated user,
			// sign out the client, and bring up a friendly message to the UI.
			const errorMessage = err instanceof Error ? err.message : "An error occurred during sign up";
			await auth.signOut();
			setLoginError(errorMessage);
			console.error(err);
		}
	}

	return (
		<div className={styles.pageWrapper}>
			<div className={styles.container}>
				<div className={styles.logoContainer}>
					<div className={styles.logo}>eT</div>
				</div>
				<h1 className={styles.title}>Welcome Back</h1>
				<p className={styles.subtitle}>Sign in to your eTuckShop account</p>
				{authLoading ? (
					<div className={styles.loadingContainer}>
						<div className={styles.spinner} />
					</div>
				) : (
					<>
						{loginError && <div className={styles.errorMessage}>{loginError}</div>}
						<form onSubmit={handleLogin}>
							<div className={styles.formGroup}>
								<label htmlFor="email" className={styles.label}>
									Email
								</label>
								<input
									type="email"
									id="email"
									name="email"
									required
									placeholder="Enter your email"
									className={styles.input}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className={styles.formGroupLast}>
								<label htmlFor="password" className={styles.label}>
									Password
								</label>
								<input
									type="password"
									id="password"
									name="password"
									required
									placeholder="Enter your password"
									className={styles.input}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
							<button
								type="submit"
								className={styles.button}
								disabled={authLoading}
							>
								Sign In
							</button>
						</form>
						<div className={styles.linkContainer}>
							<Link href="/register">Don&apos;t have an account? Sign Up</Link>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
