import { adminAuth } from "@/firebase/admin";

export async function POST(request: Request) {
	try {
		const authHeader = request.headers.get("authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const token = authHeader.split(" ")[1];
		let decoded;
		try {
			decoded = await adminAuth.verifyIdToken(token);
		} catch {
			return Response.json({ error: "Invalid token" }, { status: 401 });
		}

		const { role } = await request.json();
		await adminAuth.setCustomUserClaims(decoded.uid, { role });

		console.log("User created");

		return Response.json({ success: true }, { status: 201 });
	} catch (error) {
		console.error("Error in POST /api/users:", error);
		return Response.json({ error: "Failed to create user" }, { status: 500 });
	}
}
