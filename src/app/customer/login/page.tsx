"use client";
import { authStyles } from "@/app/auth.module";
import { useState } from "react";
import { auth } from "@/firebase/config";
import Link from "next/link";

export default function CustomerLogin() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	return (
		<div style={authStyles.container}>
			<h1 style={authStyles.title}>Login</h1>
			<form>
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
