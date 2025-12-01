import { adminAuth } from "@/firebase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { token } = await request.json();
		if (!token) {
			return NextResponse.json({ error: "No token" }, { status: 400 });
		}

		const expiresIn = 1000 * 60 * 60 * 24 * 2; // 2 days
		const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

		const res = NextResponse.json({ success: true });
		// Set cookie
		res.cookies.set("session", sessionCookie, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: expiresIn / 1000,
			path: "/",
		});

		return res;
	} catch (err) {
		console.error("Session login error:", err);
		return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
	}
}

export async function DELETE(request: NextRequest){
    const response = NextResponse.json({ message: "logged out" });

	response.cookies.set({
		name: "session",
		value: "",
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 0,          // ← DELETE COOKIE
	});

	return response;
}