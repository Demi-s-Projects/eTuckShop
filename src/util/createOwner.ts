import { adminAuth } from "@/firebase/admin";

// Simple email regex (good enough for input validation)
const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;

async function main() {
	const email = process.argv[2];
	const password = process.argv[3];
	const firstName = process.argv[4];
	const lastName = process.argv[5];

	if (!email || !password || !firstName || !lastName) {
		console.error("Missing required arguments.");
		console.error("Usage: node createOwner.js <email> <password> <firstName> <lastName>");
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
		const displayName = `${firstName} ${lastName}`.trim();
		const user = await adminAuth.createUser({ email, password, displayName });
		console.log(`User created: UID=${user.uid} (displayName=${displayName})`);

		console.log("Assigning role...");
		await adminAuth.setCustomUserClaims(user.uid, { role: "owner" });
		console.log("Owner role assigned");
		process.exit(0);
	} catch (errUnknown) {
		
        //Claude error handling to get something sensible out of an error message
		const err = errUnknown as unknown;
		// extract possible code/message safely without using `any`
		const maybeErrObj = err && typeof err === "object" ? err as { code?: unknown; message?: unknown } : undefined;
		const code = maybeErrObj && typeof maybeErrObj.code === "string" ? maybeErrObj.code : null;
		const message = maybeErrObj && typeof maybeErrObj.message === "string" ? maybeErrObj.message : null;

		console.error("Failed to create user:");
		if (typeof code === "string" && code.includes("email-already-exists")) {
			console.error("The provided email is already in use. Choose a different email or delete the existing user.");
			process.exit(2);
		}

		// fallback to printing message or the raw error
		if (typeof message === "string") console.error(message);
		else console.error(err);
		process.exit(1);
	}
}

main();
