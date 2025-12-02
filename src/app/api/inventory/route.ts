import { adminDB, adminAuth } from "@/firebase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function verify(request: Request) {
  try {
    // Check for session cookie first (consistent with your auth pattern)
    const cookieHeader = request.headers.get("cookie");
    let token: string | undefined;

    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      const sessionCookie = cookies.find((c) => c.startsWith("session="));
      if (sessionCookie) {
        token = sessionCookie.split("=")[1];
      }
    }

    // Fallback to Authorization header if no session cookie
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return { error: "Unauthorized", status: 401 };
    }

    // Verify the token/session cookie
    const decoded = await adminAuth.verifySessionCookie(token, true);

    // Check if user has employee or owner role
    const userRole = decoded.role;
    if (userRole !== "employee" && userRole !== "owner") {
      return {
        error: "Forbidden: Employee or Owner access required",
        status: 403,
      };
    }

    return { user: decoded };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { error: "Invalid session", status: 401 };
  }
}

//GET all inventory items
export async function GET(request: NextRequest) {
  //Verify authentication and authorization
  const authResult = await verify(request);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    //Fetch all the inventory items from Firestore
    const inventorySnapshot = await adminDB.collection("inventory").get();

    const items = inventorySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

//Add new inventory item
export async function POST(request: NextRequest) {
  const authResult = await verify(request);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      price,
      costPrice,
      quantity,
      minStockThreshold,
    } = body;

    if (!name || !category || price === undefined || quantity === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, price, quantity" },
        { status: 400 }
      );
    }
    if (quantity < 0 || price < 0) {
      return NextResponse.json(
        { error: "Quantity and price must be non-negative" },
        { status: 400 }
      );
    }

    let status = "in stock";
    const threshold = minStockThreshold || 10;

    if (quantity === 0) {
      status = "out of stock";
    } else if (quantity <= threshold) {
      status = "low stock";
    }

    //Create new item
    const newItem = {
      name: name.trim(),
      description: description?.trim() || "",
      category,
      price: parseFloat(price),
      costPrice: parseFloat(costPrice) || 0,
      quantity: parseInt(quantity),
      minStockThreshold: threshold,
      status,
      lastUpdated: new Date().toISOString(),
      updatedBy: authResult.user.uid,
    };

    const docRef = await adminDB.collection("inventory").add(newItem);

    console.log("Inventory item added:", docRef.id);

    return NextResponse.json(
      {
        message: "Item added successfully",
        itemId: docRef.id,
        item: newItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
