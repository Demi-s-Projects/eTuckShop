"use client";
import { useState, FormEvent } from "react";
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/config";
import Link from "next/link";
import { authStyles } from "@/app/auth.module";

export default function CustomerRegister() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);
	const [signupError, setSignupError] = useState("");

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
		try {
			const UserCred = await createUserWithEmailAndPassword(email, password);
            const user = UserCred?.user;
            const token = await user?.getIdToken();
            await fetch("/api/users", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({role: "customer"})
            })
            //error handling in case api dies or fails to create role
			setEmail("");
			setPassword("");
		} catch (err) {
			console.error(err);
		}
	}

	return (
		<div style={authStyles.container}>
			<h1 style={authStyles.title}>Sign Up</h1>
			<form onSubmit={handleSubmit}>
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
                        value={email}
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
                        value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<button type="submit" style={authStyles.button}>
					Sign Up
				</button>
			</form>
			<div style={authStyles.linkContainer}>
				<Link href="/customer/login">Already have an account? Login</Link>
			</div>
		</div>
	);
}
