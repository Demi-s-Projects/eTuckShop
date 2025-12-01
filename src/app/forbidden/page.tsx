import Link from "next/link";
import { authStyles } from "@/app/auth.module";


//Page to show people who end up on the wrong side of the system
export default function ForbiddenPage() {
	return (
		<div style={authStyles.container}>
			<h1 style={{ ...authStyles.title, color: "#c33" }}>Access Denied</h1>
			<p style={{ marginBottom: 24, lineHeight: 1.6 }}>
				You don&apos;t have permission to access this page. If you believe this is an error, please contact support.
			</p>
			<Link href="/login">
				<button style={authStyles.button}>Back to Login</button>
			</Link>
		</div>
	);
}
