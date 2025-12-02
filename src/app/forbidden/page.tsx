import Link from "next/link";
import styles from "@/styles/Auth.module.css";


//Page to show people who end up on the wrong side of the system
export default function ForbiddenPage() {
	return (
		<div className={styles.pageWrapper}>
			<div className={styles.container}>
				<div className={styles.logoContainer}>
					<div className={styles.logo}>eT</div>
				</div>
				<h1 className={`${styles.title} ${styles.errorTitle}`}>Access Denied</h1>
				<p className={styles.description}>
					You don&apos;t have permission to access this page. If you believe this is an error, please contact support.
				</p>
				<Link href="/login">
					<button className={styles.button}>Back to Login</button>
				</Link>
			</div>
		</div>
	);
}
