/**
 * Orders API Route Handler
 * 
 * Server-side API for managing orders in Firebase Firestore.
 * This module provides CRUD operations for the 'orders' collection.
 * 
 * Endpoints:
 * - GET:    Retrieve all orders or a specific order by OrderID
 * - POST:   Create a new order
 * - PUT:    Update an existing order
 * - DELETE: Remove an order from the collection
 * 
 * All operations use Firebase Admin SDK to bypass client-side security rules.
 */

import { adminDB } from "@/firebase/admin";
import type { Order, CreateOrderRequest, UpdateOrderRequest } from "@/types/Order";
import { FieldValue } from "firebase-admin/firestore";

// Firestore collection reference for orders
const ORDERS_COLLECTION = "orders";

/**
 * GET Handler - Retrieve orders
 * 
 * Query Parameters:
 * - orderId (optional): If provided, returns a single order matching this ID
 * - userId (optional): If provided, returns all orders for this user
 * 
 * Returns:
 * - 200: Order(s) found successfully
 * - 404: Order not found (when querying by ID)
 * - 500: Server error
 */
export async function GET(request: Request) {
    try {
        // Parse URL to extract query parameters
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("orderId");
        const userId = searchParams.get("userId");

        // If orderId is provided, fetch a single order
        if (orderId) {
            const orderIdNum = parseInt(orderId, 10);
            
            // Query Firestore for the specific order
            const snapshot = await adminDB
                .collection(ORDERS_COLLECTION)
                .where("OrderID", "==", orderIdNum)
                .limit(1)
                .get();

            // Check if the order exists
            if (snapshot.empty) {
                return Response.json(
                    { error: "Order not found" },
                    { status: 404 }
                );
            }

            // Convert Firestore document to Order type
            const doc = snapshot.docs[0];
            const data = doc.data();
            const order: Order = {
                OrderID: data.OrderID,
                OrderTime: data.OrderTime.toDate(),
                userId: data.userId,
                displayName: data.displayName,
                OrderContents: data.OrderContents,
                TotalPrice: data.TotalPrice,
                status: data.status || 'pending',
            };

            return Response.json({ order }, { status: 200 });
        }

        // If userId is provided, fetch all orders for that user
        if (userId) {
            // Note: Not using orderBy here to avoid requiring a composite index
            // Sorting is done client-side instead
            const snapshot = await adminDB
                .collection(ORDERS_COLLECTION)
                .where("userId", "==", userId)
                .get();

            // Map Firestore documents to Order array
            const orders: Order[] = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    OrderID: data.OrderID,
                    OrderTime: data.OrderTime.toDate(),
                    userId: data.userId,
                    displayName: data.displayName,
                    OrderContents: data.OrderContents,
                    TotalPrice: data.TotalPrice,
                    status: data.status || 'pending',
                };
            });

            return Response.json({ orders }, { status: 200 });
        }

        // No filters provided - return all orders (consider pagination for production)
        const snapshot = await adminDB
            .collection(ORDERS_COLLECTION)
            .orderBy("OrderTime", "desc")
            .get();

        // Map all documents to Order array
        const orders: Order[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                OrderID: data.OrderID,
                OrderTime: data.OrderTime.toDate(),
                userId: data.userId,
                displayName: data.displayName,
                OrderContents: data.OrderContents,
                TotalPrice: data.TotalPrice,
                status: data.status || 'pending',
            };
        });

        return Response.json({ orders }, { status: 200 });
    } catch (error) {
        console.error("Error in GET /api/orders:", error);
        return Response.json(
            { error: "Failed to retrieve orders" },
            { status: 500 }
        );
    }
}

/**
 * POST Handler - Create a new order
 * 
 * Request Body:
 * - userId: string (required) - Firebase Auth UID of the customer
 * - displayName: string (required) - Display name of the customer
 * - OrderContents: OrderItem[] (required) - Array of items being ordered
 * - TotalPrice: number (required) - Total price of the order
 * 
 * The server generates:
 * - OrderID: Auto-incremented based on the highest existing OrderID
 * - OrderTime: Server timestamp when the order is created
 * 
 * Returns:
 * - 201: Order created successfully
 * - 400: Missing required fields
 * - 500: Server error
 */
export async function POST(request: Request) {
    try {
        // Parse the request body
        const body: CreateOrderRequest = await request.json();

        // Validate required fields
        if (!body.userId || !body.displayName || !body.OrderContents || body.TotalPrice === undefined) {
            return Response.json(
                { error: "userId, displayName, OrderContents, and TotalPrice are required" },
                { status: 400 }
            );
        }

        // Validate OrderContents is an array
        if (!Array.isArray(body.OrderContents) || body.OrderContents.length === 0) {
            return Response.json(
                { error: "OrderContents must be a non-empty array of items" },
                { status: 400 }
            );
        }

        // Generate the next OrderID by finding the current maximum
        // This ensures unique, sequential order IDs
        const lastOrderSnapshot = await adminDB
            .collection(ORDERS_COLLECTION)
            .orderBy("OrderID", "desc")
            .limit(1)
            .get();

        // If no orders exist, start from 1; otherwise increment the last ID
        const nextOrderId = lastOrderSnapshot.empty
            ? 1
            : lastOrderSnapshot.docs[0].data().OrderID + 1;

        // Prepare the order document for Firestore
        const orderData = {
            OrderID: nextOrderId,
            OrderTime: FieldValue.serverTimestamp(), // Use server timestamp for consistency
            userId: body.userId,
            displayName: body.displayName,
            OrderContents: body.OrderContents,
            TotalPrice: body.TotalPrice,
            status: 'pending' as const, // New orders start as pending
        };

        // Add the order to Firestore
        const docRef = await adminDB.collection(ORDERS_COLLECTION).add(orderData);

        console.log(`Order created with ID: ${nextOrderId}, Document ID: ${docRef.id}`);

        return Response.json(
            {
                success: true,
                orderId: nextOrderId,
                documentId: docRef.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error in POST /api/orders:", error);
        return Response.json(
            { error: "Failed to create order" },
            { status: 500 }
        );
    }
}

/**
 * PUT Handler - Update an existing order
 * 
 * Request Body:
 * - OrderID: number (required) - The order to update
 * - displayName: string (optional) - New display name
 * - OrderContents: OrderItem[] (optional) - New order contents
 * - TotalPrice: number (optional) - New total price
 * - status: OrderStatus (optional) - New order status
 * 
 * Note: OrderTime and userId cannot be modified
 * 
 * Returns:
 * - 200: Order updated successfully
 * - 400: Missing OrderID
 * - 404: Order not found
 * - 500: Server error
 */
export async function PUT(request: Request) {
    try {
        // Parse the request body
        const body: UpdateOrderRequest = await request.json();

        // Validate that OrderID is provided
        if (body.OrderID === undefined || body.OrderID === null) {
            return Response.json(
                { error: "OrderID is required" },
                { status: 400 }
            );
        }

        // Find the order document by OrderID
        const snapshot = await adminDB
            .collection(ORDERS_COLLECTION)
            .where("OrderID", "==", body.OrderID)
            .limit(1)
            .get();

        // Check if the order exists
        if (snapshot.empty) {
            return Response.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        // Build the update object with only provided fields
        // This allows partial updates
        const updateData: Partial<Pick<Order, "displayName" | "OrderContents" | "TotalPrice" | "status">> = {};
        
        if (body.displayName !== undefined) {
            updateData.displayName = body.displayName;
        }
        if (body.OrderContents !== undefined) {
            updateData.OrderContents = body.OrderContents;
        }
        if (body.TotalPrice !== undefined) {
            updateData.TotalPrice = body.TotalPrice;
        }
        if (body.status !== undefined) {
            updateData.status = body.status;
        }

        // Only perform update if there are fields to update
        if (Object.keys(updateData).length === 0) {
            return Response.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        // Update the document in Firestore
        const docRef = snapshot.docs[0].ref;
        await docRef.update(updateData);

        console.log(`Order ${body.OrderID} updated successfully`);

        return Response.json(
            { success: true, orderId: body.OrderID },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in PUT /api/orders:", error);
        return Response.json(
            { error: "Failed to update order" },
            { status: 500 }
        );
    }
}

/**
 * DELETE Handler - Remove an order
 * 
 * Query Parameters:
 * - orderId: number (required) - The OrderID of the order to delete
 * 
 * Returns:
 * - 200: Order deleted successfully
 * - 400: Missing orderId parameter
 * - 404: Order not found
 * - 500: Server error
 */
export async function DELETE(request: Request) {
    try {
        // Parse URL to extract the orderId parameter
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("orderId");

        // Validate that orderId is provided
        if (!orderId) {
            return Response.json(
                { error: "orderId query parameter is required" },
                { status: 400 }
            );
        }

        const orderIdNum = parseInt(orderId, 10);

        // Find the order document by OrderID
        const snapshot = await adminDB
            .collection(ORDERS_COLLECTION)
            .where("OrderID", "==", orderIdNum)
            .limit(1)
            .get();

        // Check if the order exists
        if (snapshot.empty) {
            return Response.json(
                { error: "Order not found" },
                { status: 404 }
            );
        }

        // Delete the document from Firestore
        const docRef = snapshot.docs[0].ref;
        await docRef.delete();

        console.log(`Order ${orderIdNum} deleted successfully`);

        return Response.json(
            { success: true, orderId: orderIdNum },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in DELETE /api/orders:", error);
        return Response.json(
            { error: "Failed to delete order" },
            { status: 500 }
        );
    }
}
