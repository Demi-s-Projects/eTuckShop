import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/firebase/admin";
import { VALID_ROLES } from "@/util/consts";
/**
 * GET /api/reports/sales
 *
 * Fetch completed orders within a date range for sales reports.
 *
 * Query params:
 * - startDate: ISO date string (YYYY-MM-DD)
 * - endDate: ISO date string (YYYY-MM-DD)
 */

export interface Item{
    name: string,
    itemId: string,
    quantity: number,
    priceAtPurchase: number,

}
export interface Order{
    OrderDate: Date,
    OrderTime: Date,
    Customer: string,
    Items?: Item[],
    ItemNames: string,
    ItemCount: number,
    Sale: number,
    Profit?: number,
}

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		// Verify auth
		const authHeader = req.headers.get("authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
		}

		const token = authHeader.split(" ")[1];
		let decoded;
		try {
			decoded = await adminAuth.verifyIdToken(token);
		} catch (e) {
			return new NextResponse(JSON.stringify({ error: "Invalid token" }), { status: 401 });
		}

		const { role } = decoded;
		if (role !== "owner") {
			return Response.json({ error: "Invalid role" }, { status: 400 });
		}

		if (!startDate || !endDate) {
			return new NextResponse(JSON.stringify({ error: "Missing date range" }), { status: 400 });
		}

		// Parse dates
		const start = new Date(`${startDate}T00:00:00.000Z`);
		const end = new Date(`${endDate}T23:59:59.999Z`);

		// Query completed orders from Firestore
		const ordersSnap = await adminDB
			.collection("orders")
			.where("status", "==", "completed")
			.where("OrderTime", ">=", start)
			.where("OrderTime", "<=", end)
			.get();

		const orders: Order[] = [];
		ordersSnap.forEach((doc) => {
			const data = doc.data();
			orders.push({
				OrderDate: data.OrderTime?.toDate?.()?.toISOString()?.slice(0, 10) || "",
				OrderTime: data.OrderTime?.toDate?.()?.toTimeString().slice(0, 8) || "",
				Customer: data.displayName || "",
                Items: data.OrderContents,
                ItemNames: data.OrderContents.map((item: Item) => item.name).join(", "),
				ItemCount: data.OrderContents?.length || 0,
				Sale: data.TotalPrice || 0,
			});
		});

		const inventorySnap = await adminDB.collection("inventory").get();

		const inventoryMap: Record<string, FirebaseFirestore.DocumentData> = {};
		inventorySnap.forEach((doc) => {
			inventoryMap[doc.id] = doc.data(); // costPrice, category, etc.
		});

		for (const order of orders) {
			let orderProfit = 0;

			for (const item of order.Items!) {
				const inv = inventoryMap[item.itemId];
				if (!inv) continue; // item might not exist anymore

				const cost = inv.costPrice;
				const sell = item.priceAtPurchase;
				const qty = item.quantity;

				const profit = (sell - cost) * qty;

				orderProfit += profit;
			}
			order.Profit = orderProfit;
		}

        orders.forEach(order => {
            delete order.Items
        })

		return NextResponse.json({ data: orders });
	} catch (err) {
		console.error("Sales report error:", err);
		return new NextResponse(JSON.stringify({ error: "Failed to generate report" }), { status: 500 });
	}
}
