/**
 * MenuItem Type Definition
 * 
 * Represents a menu item available for purchase in the eTuckShop.
 */

export type MenuItem = {
    /** Unique identifier for the menu item */
    id: string;
    /** Display name of the item */
    name: string;
    /** Description of the item */
    description: string;
    /** Price in currency units (e.g., dollars) */
    price: number;
    /** Category of the item (e.g., "Snacks", "Drinks", "Meals") */
    category: string;
    /** URL to the item's image (optional) */
    imageUrl?: string;
    /** Whether the item is currently available */
    available: boolean;
};

/**
 * CartItem extends MenuItem with quantity
 */
export type CartItem = MenuItem & {
    /** Quantity of this item in the cart */
    quantity: number;
};
