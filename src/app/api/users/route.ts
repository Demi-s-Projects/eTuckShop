import { adminAuth } from "@/firebase/admin";

export async function POST(request: Request) {
	try {
    // Extract the Authorization header from the request and get the Bearer token
    // the request to attach this role should have had a header Authorization: Bearer <token>
		const authHeader = request.headers.get("authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
		const token = authHeader.split(" ")[1];

		let decoded;
		try {
			// Verify the ID token using Firebase Admin SDK
			// This ensures the user is actually authenticated
			decoded = await adminAuth.verifyIdToken(token);
		} catch {
			// If token verification fails send error to client
			return Response.json({ error: "Invalid token" }, { status: 401 });
		}

		// Parse the request body to get the role
		const { role } = await request.json();

		// Assign custom claims (role) to the user
        // We can get this from the user's token elsewhere
		await adminAuth.setCustomUserClaims(decoded.uid, { role });

		console.log("User created with role:", role);

		return Response.json({ success: true }, { status: 201 });
	} catch (error) {
		// Catch any unexpected errors
		console.error("Error in POST /api/users:", error);
		return Response.json({ error: "Failed to create user" }, { status: 500 });
	}
}
