"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { updateProfile } from "firebase/auth";
import { auth } from "@/firebase/config";

import styles from "@/styles/Auth.module.css";

// Customer registration page — collects name/email/password, creates
// an account in Firebase Auth, assigns the `customer` role via the
// backend `/api/users` endpoint and establishes a session cookie.
export default function CustomerRegister() {
	const router = useRouter();

	// Form fields
	const [email, setEmail] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [password, setPassword] = useState("");

	// Firebase hook for creating users with email/password
	const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);

	// Error alerts
	const [signupError, setSignupError] = useState("");

	async function handleRegister(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSignupError("");

		try {
			//Create a client side Firebase Auth user 
			const UserCred = await createUserWithEmailAndPassword(email, password);
			const user = UserCred?.user;
			if (!user) throw new Error("No user returned from Firebase");

			//Update the user's displayName in Firebase Auth so the
			//    backend and other clients can read a friendly name.
			await updateProfile(user, { displayName: `${firstName} ${lastName}` });

			//Call backend to assign a role to the user
			const token = await user?.getIdToken();
			const res = await fetch("/api/users", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ role: "customer"}),
			});

			if (!res.ok) throw new Error("Failed to create user role");

			//Refresh token so it contains the new role
			const freshToken = await user?.getIdToken(true);

			//Exchange the refreshed token for a session cookie
			const sessionRes = await fetch("/api/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: freshToken }),
			});

			if (!sessionRes.ok) {
				throw new Error("Failed to create session");
			}

			//naviagate to home page
			router.replace("/customer/home");

			setFirstName("");
			setLastName("");
			setEmail("");
			setPassword("");
		} catch (err) {
			// On failure: attempt to clean up any partially created auth user,
			// sign out the client, and bring up a friendly message to the UI.
			const errorMessage = err instanceof Error ? err.message : "An error occurred during sign up";
			await auth.currentUser?.delete(); 
			await auth.signOut();
			setSignupError(errorMessage);
			console.error(err);
		}
	}

	return (
		<div className={styles.pageWrapper}>
			<div className={styles.container}>
				<div className={styles.logoContainer}>
					<div className={styles.logo}>eT</div>
				</div>
				<h1 className={styles.title}>Create Account</h1>
				<p className={styles.subtitle}>Join eTuckShop to start ordering</p>
				{signupError && <div className={styles.errorMessage}>{signupError}</div>}
				<form onSubmit={handleRegister}>
					<div className={styles.nameRow}>
						<div className={styles.flex1}>
							<label htmlFor="firstName" className={styles.label}>
								First name
							</label>
							<input
								type="text"
								id="firstName"
								name="firstName"
								required
								placeholder="John"
								className={styles.input}
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
						</div>
						<div className={styles.flex1}>
							<label htmlFor="lastName" className={styles.label}>
								Last name
							</label>
							<input
								type="text"
								id="lastName"
								name="lastName"
								required
								placeholder="Doe"
								className={styles.input}
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
							/>
						</div>
					</div>
					<div className={styles.formGroup}>
						<label htmlFor="email" className={styles.label}>
							Email
						</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							placeholder="john.doe@example.com"
							className={styles.input}
							value={email}
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
							placeholder="Create a password"
							className={styles.input}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<button type="submit" className={styles.button}>
						Create Account
					</button>
				</form>
				<div className={styles.linkContainer}>
					<Link href="/login">Already have an account? Sign In</Link>
				</div>
			</div>
		</div>
	);
}
