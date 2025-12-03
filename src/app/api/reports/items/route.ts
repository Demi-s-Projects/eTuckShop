import { NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/firebase/admin";
import { VALID_ROLES } from "@/util/consts";

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
		} catch (e) {
			return new NextResponse(JSON.stringify({ error: "Invalid token" }), { status: 401 });
		}

		const { role } = decoded as { role?: string };
		if (role !== "owner") {
			return NextResponse.json({ error: "Invalid role" }, { status: 400 });
		}

		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		// If no date range provided, return inventory list (backwards compatible behavior)
		if (!startDate || !endDate) {
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
					costPrice: data.costPrice ?? null,
					status: data.status || null,
				});
			});

			return NextResponse.json({ data: items });
		}

		// Parse dates for query
		const start = new Date(`${startDate}T00:00:00.000`);
		const end = new Date(`${endDate}T23:59:59.999`);

		// Query completed orders within range
		const ordersSnap = await adminDB
			.collection("orders")
			.where("status", "==", "completed")
			.where("OrderTime", ">=", start)
			.where("OrderTime", "<=", end)
			.get();

		// Aggregate sales per itemId
		type AggRow = {
			itemId: string;
			name: string;
			orderIds: Set<string>;
			totalQuantity: number;
			revenue: number;
		};

		const agg: Record<string, AggRow> = {};

		ordersSnap.forEach((doc) => {
			const data = doc.data();
			const orderId = String(data.OrderID ?? doc.id);
			const contents = data.OrderContents || [];
			for (const it of contents) {
				const id = it.itemId || it.itemID || String(it.itemId || "");
				if (!id) continue;
				const name = it.name || "";
				const qty = Number(it.quantity ?? 0);
				const priceAtPurchase = Number(it.priceAtPurchase ?? it.price ?? 0);

				if (!agg[id]) {
					agg[id] = {
						itemId: id,
						name,
						orderIds: new Set(),
						totalQuantity: 0,
						revenue: 0,
					};
				}

				agg[id].orderIds.add(orderId);
				agg[id].totalQuantity += qty;
				agg[id].revenue += priceAtPurchase * qty;
			}
		});

		// Load inventory to enrich results
		let inventorySnap = await adminDB.collection("inventory").get();
		if (inventorySnap.empty) {
			// fallback to capitalized collection name used elsewhere
			inventorySnap = await adminDB.collection("Inventory").get();
		}

		const inventoryMap: Record<string, FirebaseFirestore.DocumentData> = {};
		inventorySnap.forEach((doc) => {
			inventoryMap[doc.id] = doc.data();
		});

		const results = Object.values(agg).map((r) => {
			const inv = inventoryMap[r.itemId];
			const costPrice = inv?.costPrice ?? null;
			const costTotal = costPrice != null ? Number(costPrice) * r.totalQuantity : null;
			const profit = costTotal != null ? r.revenue - costTotal : null;

		    return {
				Name: r.name || inv?.name || null,
				Sales: r.orderIds.size,
				BasePrice: inv?.price ?? null,
				CostPrice: costPrice != null ? Number(costPrice) : null,
                CostTotal: costTotal != null? Number(costTotal) : null,
				Revenue: Number(r.revenue),
				Profit: profit != null ? Number(profit) : null,
				CurrentStock: inv?.quantity ?? null,
				Category: inv?.category ?? null,
                Status: inv?.status ?? null,
			};
		});


		return NextResponse.json({ data: results });
	} catch (err) {
		console.error("Items report error:", err);
		return new NextResponse(JSON.stringify({ error: "Failed to generate report" }), { status: 500 });
	}
}
