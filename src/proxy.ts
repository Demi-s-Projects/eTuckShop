import { NextResponse, NextRequest } from "next/server";
import { adminAuth } from "@/firebase/admin";

// Paths that require authentication + role checks
export const config = {
	matcher: ["/owner/:path*", "/customer/:path*"],
};

export async function proxy(req: NextRequest) {
	const session = req.cookies.get("session")?.value;

	const res = NextResponse.next();

	// If no session cookie then redirect to login
	if (!session) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	try {
		// Verify Firebase Session Cookie
		const decoded = await adminAuth.verifySessionCookie(session, true);

		const role = decoded.role;
		const path = req.nextUrl.pathname;

		// OWNER-only routes
		if (path.startsWith("/owner") && role !== "owner") {
			return NextResponse.redirect(new URL("/forbidden", req.url));
		}

		// CUSTOMER-only routes
		if (path.startsWith("/customer") && role !== "customer") {
			return NextResponse.redirect(new URL("/forbidden", req.url));
		}

		// Allow request to continue
		return res;
	} catch (err) {
		// Cookie invalid or expired → delete cookie and redirect
		const res = NextResponse.redirect(new URL("/login", req.url));
		res.cookies.delete("session");
		return res;
	}
}
