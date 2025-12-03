import { adminDB } from "@/firebase/admin";
import { verify } from "@/app/api/inventory/route";
import { NextRequest, NextResponse } from "next/server";

/** Route params type for dynamic inventory item routes */
type RouteParams = {
  params: Promise<{ itemId: string }>;
};

// GET single inventory item
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { itemId } = await params;
  const authResult = await verify(request);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const itemDoc = await adminDB.collection("inventory").doc(itemId).get();

    if (!itemDoc.exists) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: itemDoc.id,
        ...itemDoc.data(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

// PUT - Update existing inventory item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { itemId } = await params;
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

    const itemRef = adminDB.collection("inventory").doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Validation
    if (quantity !== undefined && quantity < 0) {
      return NextResponse.json(
        { error: "Quantity cannot be negative" },
        { status: 400 }
      );
    }

    if (price !== undefined && price < 0) {
      return NextResponse.json(
        { error: "Price cannot be negative" },
        { status: 400 }
      );
    }

    if (costPrice !== undefined && costPrice < 0) {
      return NextResponse.json(
        { error: "Cost cannot be negative" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Name field cannot be empty" },
        { status: 400 }
      );
    }

    if (minStockThreshold < 0) {
      return NextResponse.json(
        { error: "Minimum stock cannot be negative" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      lastUpdated: new Date().toISOString(),
      updatedBy: authResult.user.uid,
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = parseFloat(price);
    if (costPrice !== undefined) updates.costPrice = parseFloat(costPrice);

    if (quantity !== undefined) {
      updates.quantity = parseInt(quantity);

      // Update status based on new quantity
      // Handle legacy field name 'minStock' for backward compatibility
      const existingData = itemDoc.data();
      const threshold =
        minStockThreshold ||
        existingData?.minStockThreshold ||
        existingData?.minStock ||
        10;

      if (quantity === 0) {
        updates.status = "out of stock";
      } else if (quantity <= threshold) {
        updates.status = "low stock";
      } else {
        updates.status = "in stock";
      }
    }

    if (minStockThreshold !== undefined) {
      updates.minStockThreshold = minStockThreshold;
    }

    // Update in Firestore
    await itemRef.update(updates);

    // Fetch updated document
    const updatedDoc = await itemRef.get();

    console.log("Inventory item updated:", itemId);

    return NextResponse.json(
      {
        message: "Item updated successfully",
        item: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE - Remove inventory item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { itemId } = await params;
  const authResult = await verify(request);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const itemRef = adminDB.collection("inventory").doc(itemId);
    const itemDoc = await itemRef.get();

    if (!itemDoc.exists) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await itemRef.delete();

    console.log("Inventory item deleted:", itemId);

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
