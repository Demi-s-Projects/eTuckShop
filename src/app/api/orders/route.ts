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

import { adminDB, adminAuth } from "@/firebase/admin";
import type { Order, CreateOrderRequest, UpdateOrderRequest, OrderItem } from "@/types/Order";
import { FieldValue } from "firebase-admin/firestore";
import type { InventoryStatus } from "@/app/api/inventory/inventory";

// Firestore collection reference for orders
const ORDERS_COLLECTION = "orders";
const INVENTORY_COLLECTION = "inventory";

/**
 * Verifies the user's session and returns user info or error
 * Supports both session cookies and Authorization bearer tokens
 */
async function verifyAuth(request: Request) {
    try {
        const cookieHeader = request.headers.get("cookie");
        let token: string | undefined;

        // Check for session cookie first
        if (cookieHeader) {
            const cookies = cookieHeader.split(";").map((c) => c.trim());
            const sessionCookie = cookies.find((c) => c.startsWith("session="));
            if (sessionCookie) {
                token = sessionCookie.split("=")[1];
            }
        }

        // Fallback to Authorization header
        if (!token) {
            const authHeader = request.headers.get("authorization");
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            return { error: "Unauthorized", status: 401 };
        }

        // Verify the session cookie
        const decoded = await adminAuth.verifySessionCookie(token, true);
        return { user: decoded };
    } catch (error) {
        console.error("Auth verification error:", error);
        return { error: "Invalid session", status: 401 };
    }
}

/**
 * Verifies the user has employee or owner role
 */
async function verifyEmployeeOrOwner(request: Request) {
    const authResult = await verifyAuth(request);
    if ("error" in authResult) {
        return authResult;
    }
    
    const userRole = authResult.user.role;
    if (userRole !== "employee" && userRole !== "owner") {
        return { error: "Forbidden: Employee or Owner access required", status: 403 };
    }
    
    return authResult;
}

/**
 * Calculates the inventory status based on quantity and threshold
 */
function calculateInventoryStatus(quantity: number, minStockThreshold: number): InventoryStatus {
    if (quantity <= 0) return "out of stock";
    if (quantity <= minStockThreshold) return "low stock";
    return "in stock";
}

/** Error types for inventory issues */
type InventoryErrorType = 'insufficient_stock' | 'item_not_found' | 'processing_error';

/** Structured error for inventory issues */
interface InventoryError {
    type: InventoryErrorType;
    itemName: string;
    message: string;
    requested?: number;
    available?: number;
}

/**
 * Deducts stock from inventory for each item in an order
 * Uses batch reads for efficiency and batch writes for atomic updates
 * Also calculates the server-side total price for security
 * 
 * @param orderItems - Array of items to deduct from inventory
 * @returns Object with success status, calculated price, and structured errors
 */
async function deductInventoryStock(orderItems: OrderItem[]): Promise<{ 
    success: boolean; 
    errors: InventoryError[];
    calculatedPrice?: number;
}> {
    const errors: InventoryError[] = [];
    const batch = adminDB.batch();
    let calculatedPrice = 0;
    
    try {
        // Batch read: Get all inventory documents in a single call
        const inventoryRefs = orderItems.map(item => 
            adminDB.collection(INVENTORY_COLLECTION).doc(item.itemId)
        );
        const inventoryDocs = await adminDB.getAll(...inventoryRefs);
        
        // Create a map for quick lookup
        const inventoryMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        inventoryDocs.forEach(doc => {
            inventoryMap.set(doc.id, doc);
        });
        
        // Process each order item
        for (const item of orderItems) {
            const inventoryDoc = inventoryMap.get(item.itemId);
            
            if (!inventoryDoc || !inventoryDoc.exists) {
                errors.push({
                    type: 'item_not_found',
                    itemName: item.name,
                    message: `"${item.name}" is no longer available in our inventory.`,
                });
                continue;
            }
            
            const inventoryData = inventoryDoc.data();
            const currentQuantity = inventoryData?.quantity ?? 0;
            const minStockThreshold = inventoryData?.minStockThreshold ?? 10;
            const itemPrice = inventoryData?.price ?? 0;
            const newQuantity = Math.max(0, currentQuantity - item.quantity);
            const newStatus = calculateInventoryStatus(newQuantity, minStockThreshold);
            
            // Calculate server-side price for this item
            calculatedPrice += itemPrice * item.quantity;
            
            // Check if there's sufficient stock
            if (currentQuantity < item.quantity) {
                errors.push({
                    type: 'insufficient_stock',
                    itemName: item.name,
                    requested: item.quantity,
                    available: currentQuantity,
                    message: currentQuantity === 0 
                        ? `"${item.name}" is out of stock.`
                        : `Only ${currentQuantity} "${item.name}" available, but you requested ${item.quantity}.`,
                });
                continue;
            }
            
            // Queue the update in the batch
            batch.update(inventoryDoc.ref, {
                quantity: newQuantity,
                status: newStatus,
                lastUpdated: new Date().toISOString(),
            });
        }
    } catch (err) {
        return {
            success: false,
            errors: [{
                type: 'processing_error',
                itemName: 'Order',
                message: 'Failed to verify inventory. Please try again.',
            }]
        };
    }
    
    // If there are errors, don't commit the batch
    if (errors.length > 0) {
        return { success: false, errors };
    }
    
    // Commit all inventory updates atomically
    try {
        await batch.commit();
        return { success: true, errors: [], calculatedPrice };
    } catch (err) {
        return { 
            success: false, 
            errors: [{
                type: 'processing_error',
                itemName: 'Order',
                message: 'Failed to update inventory. Please try again.',
            }]
        };
    }
}

/**
 * Formats inventory errors into a user-friendly summary
 */
function formatInventoryErrorMessage(errors: InventoryError[]): string {
    const stockErrors = errors.filter(e => e.type === 'insufficient_stock');
    const notFoundErrors = errors.filter(e => e.type === 'item_not_found');
    const otherErrors = errors.filter(e => e.type === 'processing_error');
    
    const messages: string[] = [];
    
    if (stockErrors.length > 0) {
        const itemList = stockErrors.map(e => e.message).join(' ');
        messages.push(itemList);
    }
    
    if (notFoundErrors.length > 0) {
        const itemNames = notFoundErrors.map(e => `"${e.itemName}"`).join(', ');
        messages.push(`The following item(s) are no longer available: ${itemNames}.`);
    }
    
    if (otherErrors.length > 0) {
        messages.push('Some items could not be processed. Please try again.');
    }
    
    return messages.join(' ') || 'Unable to process your order.';
}

/**
 * Restores stock to inventory when an order is cancelled
 * Uses batch reads for efficiency and batch writes for atomic updates
 * 
 * @param orderItems - Array of items to restore to inventory
 * @returns Object with success status and any error message
 */
async function restoreInventoryStock(orderItems: OrderItem[]): Promise<{ success: boolean; error?: string }> {
    const batch = adminDB.batch();
    
    try {
        // Batch read: Get all inventory documents in a single call
        const inventoryRefs = orderItems.map(item => 
            adminDB.collection(INVENTORY_COLLECTION).doc(item.itemId)
        );
        const inventoryDocs = await adminDB.getAll(...inventoryRefs);
        
        // Create a map for quick lookup
        const inventoryMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        inventoryDocs.forEach(doc => {
            inventoryMap.set(doc.id, doc);
        });
        
        // Process each order item
        for (const item of orderItems) {
            const inventoryDoc = inventoryMap.get(item.itemId);
            
            if (!inventoryDoc || !inventoryDoc.exists) {
                // Item no longer exists, skip restoration but log it
                console.warn(`Cannot restore stock for "${item.name}" (${item.itemId}) - item not found in inventory`);
                continue;
            }
            
            const inventoryData = inventoryDoc.data();
            const currentQuantity = inventoryData?.quantity ?? 0;
            const minStockThreshold = inventoryData?.minStockThreshold ?? 10;
            const newQuantity = currentQuantity + item.quantity;
            const newStatus = calculateInventoryStatus(newQuantity, minStockThreshold);
            
            // Queue the update in the batch
            batch.update(inventoryDoc.ref, {
                quantity: newQuantity,
                status: newStatus,
                lastUpdated: new Date().toISOString(),
            });
        }
    } catch (err) {
        console.error("Error reading inventory for restoration:", err);
        return { 
            success: false, 
            error: 'Failed to read inventory for restoration.',
        };
    }
    
    // Commit all inventory updates atomically
    try {
        await batch.commit();
        return { success: true };
    } catch (err) {
        console.error("Failed to restore inventory:", err);
        return { 
            success: false, 
            error: 'Failed to restore inventory stock.',
        };
    }
}

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
    // Verify authentication
    const authResult = await verifyAuth(request);
    if ("error" in authResult) {
        return Response.json(
            { error: authResult.error },
            { status: authResult.status }
        );
    }
    
    const currentUser = authResult.user;
    
    try {
        // Parse URL to extract query parameters
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("orderId");
        const userId = searchParams.get("userId");
        
        // Security: Customers can only view their own orders
        // Employees and owners can view all orders
        if (userId && currentUser.role === "customer" && userId !== currentUser.uid) {
            return Response.json(
                { error: "Forbidden: Cannot view other users' orders" },
                { status: 403 }
            );
        }

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
 * Stock Deduction:
 * - Automatically deducts ordered quantities from inventory
 * - Updates inventory status (in stock / low stock / out of stock)
 * - Validates sufficient stock before creating order
 * 
 * Returns:
 * - 201: Order created successfully
 * - 400: Missing required fields or insufficient stock
 * - 500: Server error
 */
export async function POST(request: Request) {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if ("error" in authResult) {
        return Response.json(
            { error: authResult.error },
            { status: authResult.status }
        );
    }
    
    const currentUser = authResult.user;
    
    try {
        // Parse the request body
        const body: CreateOrderRequest = await request.json();

        // Validate required fields (TotalPrice no longer required - calculated server-side)
        if (!body.userId || !body.displayName || !body.OrderContents) {
            return Response.json(
                { error: "userId, displayName, and OrderContents are required" },
                { status: 400 }
            );
        }
        
        // Security: Customers can only create orders for themselves
        if (currentUser.role === "customer" && body.userId !== currentUser.uid) {
            return Response.json(
                { error: "Forbidden: Cannot create orders for other users" },
                { status: 403 }
            );
        }

        // Validate OrderContents is an array
        if (!Array.isArray(body.OrderContents) || body.OrderContents.length === 0) {
            return Response.json(
                { error: "OrderContents must be a non-empty array of items" },
                { status: 400 }
            );
        }

        // Deduct stock from inventory BEFORE creating the order
        // This also calculates the server-side price for security
        const stockResult = await deductInventoryStock(body.OrderContents);
        
        if (!stockResult.success) {
            const userFriendlyMessage = formatInventoryErrorMessage(stockResult.errors);
            return Response.json(
                { 
                    error: userFriendlyMessage,
                    details: stockResult.errors,
                },
                { status: 400 }
            );
        }
        
        // Use server-calculated price instead of client-provided price
        const serverCalculatedPrice = stockResult.calculatedPrice ?? 0;

        // Generate the next OrderID using a transaction to prevent race conditions
        const nextOrderId = await adminDB.runTransaction(async (transaction) => {
            const lastOrderSnapshot = await transaction.get(
                adminDB.collection(ORDERS_COLLECTION)
                    .orderBy("OrderID", "desc")
                    .limit(1)
            );
            
            return lastOrderSnapshot.empty
                ? 1
                : lastOrderSnapshot.docs[0].data().OrderID + 1;
        });

        // Prepare the order document for Firestore
        const orderData = {
            OrderID: nextOrderId,
            OrderTime: FieldValue.serverTimestamp(), // Use server timestamp for consistency
            userId: body.userId,
            displayName: body.displayName,
            OrderContents: body.OrderContents,
            TotalPrice: serverCalculatedPrice, // Use server-calculated price
            status: 'pending' as const, // New orders start as pending
        };

        // Add the order to Firestore
        const docRef = await adminDB.collection(ORDERS_COLLECTION).add(orderData);

        console.log(`Order created with ID: ${nextOrderId}, Document ID: ${docRef.id}`);
        console.log(`Inventory deducted for ${body.OrderContents.length} item(s)`);

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
    // Verify authentication
    const authResult = await verifyAuth(request);
    if ("error" in authResult) {
        return Response.json(
            { error: authResult.error },
            { status: authResult.status }
        );
    }
    
    const currentUser = authResult.user;
    
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

        const doc = snapshot.docs[0];
        const currentOrder = doc.data();
        const currentStatus = currentOrder.status;
        
        // Security: Customers can only update their own orders
        // and can only cancel (not change other fields)
        if (currentUser.role === "customer") {
            if (currentOrder.userId !== currentUser.uid) {
                return Response.json(
                    { error: "Forbidden: Cannot modify other users' orders" },
                    { status: 403 }
                );
            }
            // Customers can only cancel their own pending orders
            if (body.status && body.status !== "cancelled") {
                return Response.json(
                    { error: "Forbidden: Customers can only cancel orders" },
                    { status: 403 }
                );
            }
            if (currentStatus !== "pending") {
                return Response.json(
                    { error: "Cannot cancel an order that is already being processed" },
                    { status: 400 }
                );
            }
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

        // Check if order is being cancelled - restore inventory stock
        // Only restore if the order wasn't already cancelled
        if (body.status === "cancelled" && currentStatus !== "cancelled" && currentStatus !== "cancelled-acknowledged") {
            const orderContents = currentOrder.OrderContents as OrderItem[];
            const restoreResult = await restoreInventoryStock(orderContents);
            
            if (restoreResult.success) {
                console.log(`Inventory restored for cancelled order ${body.OrderID}`);
            } else {
                console.warn(`Failed to restore inventory for order ${body.OrderID}: ${restoreResult.error}`);
                // Continue with cancellation even if stock restore fails
                // The order should still be marked as cancelled
            }
        }

        // Update the document in Firestore
        const docRef = doc.ref;
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
    // Verify authentication - only employees/owners can delete orders
    const authResult = await verifyEmployeeOrOwner(request);
    if ("error" in authResult) {
        return Response.json(
            { error: authResult.error },
            { status: authResult.status }
        );
    }
    
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
