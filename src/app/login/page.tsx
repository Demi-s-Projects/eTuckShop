"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/config";

import { authStyles } from "@/app/auth.module";

export default function CustomerLogin() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [signInWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);
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
				router.push("/executive/home");
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
				<button type="submit" style={authStyles.button}>
					Login
				</button>
			</form>
			<div style={authStyles.linkContainer}>
				<Link href="/customer/register">Don&apos;t have an account? Sign Up</Link>
			</div>
		</div>
	);
}
