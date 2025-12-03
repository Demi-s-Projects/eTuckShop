import { NextResponse, NextRequest } from "next/server";
import { adminAuth } from "@/firebase/admin";

//This is middleware that runs everytime next.js serves up a page
//Its purpose right now is to check sessions and make the auth flow be smooth and safe

// Paths that require authentication + role checks 
// for now just everything under owner and customer
export const config = {
	matcher: ["/owner/:path*", "/customer/:path*", "/employee/:path*"],
};

export async function proxy(req: NextRequest) {
	const session = req.cookies.get("session")?.value;
	//a session cookie (cookie i named session) is read from the client request for a page

	const res = NextResponse.next();
	//initialising a response that redirects the client to where they wanted
	//we dont do anything special with it right now but its useful to leave here
	//might need to add headers to it later or smth

	// If no session cookie then redirect to login
	if (!session) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	try {
		// Verify the session cookie in firebase to see if it belongs to someone
		const decoded = await adminAuth.verifySessionCookie(session, true);

		const role = decoded.role; //gets the role from the returned user
		const path = req.nextUrl.pathname; //gets where the user wants to go

		//below tests if you dont have the right perms then sends you back to the lobby
		if (!path.startsWith(`/${role}`)) { // OWNER-only routes
			return NextResponse.redirect(new URL("/forbidden", req.url));
		}


		// Allow request to continue
		return res;
	} catch (err) {
		// Cookie invalid or expired then delete cookie and redirect
		//we would get here if the verifySessionCookiee function call threw an error
		const res = NextResponse.redirect(new URL("/login", req.url));
		res.cookies.delete("session");
		return res;
	}
}
