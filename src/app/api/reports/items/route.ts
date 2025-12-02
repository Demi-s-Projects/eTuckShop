import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/firebase/admin";

/**
 * GET /api/reports/items
 * 
 * Fetch inventory items for item reports (can be filtered by date range).
 * 
 * Query params:
 * - startDate: ISO date string (YYYY-MM-DD) - optional
 * - endDate: ISO date string (YYYY-MM-DD) - optional
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);

		// Verify auth
		const authHeader = req.headers.get("authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
		}

		const token = authHeader.split(" ")[1];
		let decoded;
		try {
			decoded = await adminAuth.verifyIdToken(token);
		} catch (_e) {
			return new NextResponse(JSON.stringify({ error: "Invalid token" }), { status: 401 });
		}

        const { role } = decoded;
		if (role !== "owner") {
			return Response.json({ error: "Invalid role" }, { status: 400 });
		}

		// Query all inventory items from Firestore
		const itemsRef = adminDB.collection("Inventory");
		const snapshot = await itemsRef.get();

		const items: unknown[] = [];
		snapshot.forEach((doc) => {
			const data = doc.data();
			items.push({
				itemID: doc.id,
				name: data.name || "",
				category: data.category || "",
				price: data.price || 0,
				quantity: data.quantity || 0,
				description: data.description || "",
				lastUpdated: data.lastUpdated?.toDate?.()?.toISOString()?.slice(0, 10) || "",
			});
		});

		return NextResponse.json({ data: items });
	} catch (err) {
		console.error("Items report error:", err);
		return new NextResponse(JSON.stringify({ error: "Failed to generate report" }), { status: 500 });
	}
}
