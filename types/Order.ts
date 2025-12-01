/**
 * Order Type Definition
 * 
 * Represents an order placed by a customer in the eTuckShop system.
 * This type is used for both client-side display and server-side Firestore operations.
 */

/**
 * Represents a single item within an order
 */
export type OrderItem = {
    /** Menu item ID for reference */
    itemId: string;
    /** Display name of the item */
    name: string;
    /** Quantity ordered */
    quantity: number;
    /** Price per unit at time of purchase */
    priceAtPurchase: number;
};

export type Order = {
    /** Unique identifier for the order */
    OrderID: number;
    /** Timestamp when the order was placed */
    OrderTime: Date;
    /** Username of the customer who placed the order */
    Username: string;
    /** Array of items in the order */
    OrderContents: OrderItem[];
    /** Total price of the order */
    TotalPrice: number;
};

/**
 * Order data as stored in Firestore
 * Firestore stores Dates as Timestamps, so we need a separate type for database operations
 */
export type OrderDocument = {
    OrderID: number;
    OrderTime: FirebaseFirestore.Timestamp;
    Username: string;
    OrderContents: OrderItem[];
    TotalPrice: number;
};

/**
 * Request body for creating a new order
 * OrderID and OrderTime are generated server-side
 */
export type CreateOrderRequest = {
    Username: string;
    OrderContents: OrderItem[];
    TotalPrice: number;
};

/**
 * Request body for updating an existing order
 * All fields are optional except the identifier
 */
export type UpdateOrderRequest = {
    OrderID: number;
    Username?: string;
    OrderContents?: OrderItem[];
    TotalPrice?: number;
};
