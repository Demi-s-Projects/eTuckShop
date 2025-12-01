import { adminAuth } from "@/firebase/admin";
import { NextRequest, NextResponse } from "next/server";

//POST endpoint to create session
export async function POST(request: NextRequest) {
	try {
		// Parse the JSON body from the request to get the Firebase ID token
		const { token } = await request.json();
		if (!token) {
			// If no token is provided, respond appropriately
			return NextResponse.json({ error: "No token" }, { status: 400 });
		}

		// Set session expiration time 
		const expiresIn = 1000 * 60 * 60 * 24 * 2; // 2 days in milliseconds

		// Create a Firebase session cookie using the ID token
		// This allows the backend to maintain a persistent session
		const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

		// Prepare the response
		const res = NextResponse.json({ success: true });

		// Set the session cookie on the response
		res.cookies.set("session", sessionCookie, {
			httpOnly: true, // Cookie not accessible via JS for security
			secure: process.env.NODE_ENV === "production", 
			// Only require sending over HTTPS in production. 
			// This gets set when we deploy (to vercel) or build
			maxAge: expiresIn / 1000, // Max-Age in seconds
			path: "/", // Cookie valid for entire site
		});

		return res;
	} catch (err) {
		// Handle errors during session creation
		console.error("Session login error:", err);
		return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
	}
}

// DELETE endpoint to log out and remove the session cookie
export async function DELETE(request: NextRequest) {
	// Prepare a response indicating the user is logged out
	const response = NextResponse.json({ message: "logged out" });

	// Clear the session cookie by overwriting it with an expired cookie
	response.cookies.set({
		name: "session",
		value: "", // Empty value to remove
		httpOnly: true, // Keep HTTP-only for security
		secure: process.env.NODE_ENV === "production",
		path: "/", // Must match the path of the cookie being deleted
		maxAge: 0, // Max-Age = 0 deletes the cookie
	});

	//send response
	return response;
}
