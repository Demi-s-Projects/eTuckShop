import { adminAuth } from "@/firebase/admin";

// Simple email regex (good enough for input validation)
const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;

async function main() {
	const email = process.argv[2];
	const password = process.argv[3];

	if (!email || !password) {
		console.error("Missing required arguments.");
		console.error("Usage: node createUser.js <email> <password>");
		process.exit(1);
	}

	if (!emailRegex.test(email)) {
		console.error("Invalid email format.");
		process.exit(1);
	}

	if (password.length < 6) {
		console.error("Password must be at least 6 characters.");
		process.exit(1);
	}

	try {
		console.log("Creating Firebase user...");
		const user = await adminAuth.createUser({ email, password });
		console.log(`User created: UID=${user.uid}`);

		console.log("Assigning role...");
		await adminAuth.setCustomUserClaims(user.uid, { role: "owner" });
		console.log("Owner role assigned");
		process.exit(0);
	} catch (error) {
		console.error("Failed to create user:");
		console.error(error);
		process.exit(1);
	}
}

main();
