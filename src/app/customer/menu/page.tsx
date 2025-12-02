/**
 * Customer Menu Page
 * 
 * Displays the menu items for customers to browse and add to cart.
 * Uses the Dashboard layout with red theme for consistency.
 */

"use client";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import Dashboard from "@/components/Dashboard";
import type { MenuItem } from "@/types/MenuItem";
import { InventoryItem, InventoryFormData, InventoryCategory } from "@/app/api/inventory/inventory";
import styles from "@/styles/Menu.module.css";
import customerStyles from "@/styles/CustomerHome.module.css";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";



function mapCategory(cat: InventoryCategory): MenuItem["category"] {
    switch (cat) {
        case "snack":
            return "Snacks";
        case "drink":
            return "Drinks";
        case "food":
            return "Food";
        case "health and wellness":
            return "Health and Wellness";
        case "home care":
            return "Home Care";
        default:
            return "Meals";
    }
}

function MenuContent() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);

    const { addItem, totalItems } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [user, setUser] = useState<{name: string, role: string, email?: string} | undefined>(undefined);
    const [userId, setUserId] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    async function loadMenuItems() {
        try {
            const ref = collection(db, "inventory");
            const snapshot = await getDocs(ref);

            const fetched: MenuItem[] = snapshot.docs.map((doc) => {
                const data = doc.data() as InventoryItem;

                return {
                    id: doc.id,
                    name: data.name,
                    description: data.description || "",
                    price: data.price || 0,
                    category: mapCategory(data.category),
                    lowStock: data.status === "low stock",
                    available: data.status === "in stock" || data.status == "low stock",
                };
            });

            setMenuItems(fetched);
        } catch (error) {
            console.error("Error loading menu items:", error);
        }

        setItemsLoading(false);
        setLoading(false);
    }

    loadMenuItems();
}, []);
    /*
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer';
                setUser({
                    name: name,
                    role: 'Customer',
                    email: firebaseUser.email || undefined
                });
                setUserId(firebaseUser.uid);
                setDisplayName(name);
            } else {
                setUser(undefined);
                setUserId("");
                setDisplayName("Guest");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []); */

    // Group menu items by category
    const categories = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
}, {} as Record<string, MenuItem[]>);

    if (loading || itemsLoading) {
        return (
            <div className={customerStyles.loadingContainer}>
                Loading...
            </div>
        );
    }

    return (
        <Dashboard user={user} theme="red">
            <div className={customerStyles.container}>
                {/* Top action bar with cart */}
                <div className={customerStyles.topActions}>
                    <button
                        className={customerStyles.cartButton}
                        onClick={() => setIsCartOpen(true)}
                    >
                        🛒 Cart
                        {totalItems > 0 && (
                            <span className={customerStyles.cartBadge}>{totalItems}</span>
                        )}
                    </button>
                </div>

                <h1 className={customerStyles.title}>Menu</h1>
                <p className={customerStyles.welcomeText}>Browse our selection and add items to your cart</p>

                {Object.entries(categories).map(([category, items]) => (
                    <div key={category} className={styles.categorySection}>
                        <h2 className={styles.categoryTitle}>{category}</h2>
                        <div className={styles.menuGrid}>
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`${styles.menuItem} ${(!item.available && !item.lowStock) ? styles.unavailable : ""}`}
                                    //className={`${styles.menuItem} ${!item.available ? styles.unavailable : ""}`}
                                >
                                    <div
                                        className={styles.menuItemImage}
                                        style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            justifyContent: "center",
                                            fontSize: "3rem" 
                                        }}
                                    >
                                        {item.category === "Snacks" && "🍪"}
                                        {item.category === "Drinks" && "🥤"}
                                        {item.category === "Food" && "🍔"}
                                        {item.category === "Home Care" && "🏠"}
                                        {item.category === "Health and Wellness" && "💊"}
                                    </div>
                                    <h3 className={styles.menuItemName}>{item.name}</h3>
                                    <p className={styles.menuItemDescription}>
                                        {item.description}
                                    </p>
                                    <div className={styles.menuItemFooter}>
                                        <span className={styles.menuItemPrice}>
                                            ${item.price.toFixed(2)}
                                        </span>

                                        {/* Low stock label */}
                                        {item.lowStock && (
                                            <span className={styles.lowStockLabel}>
                                                Low Stock
                                            </span>
                                        )}

                                        {/* Out of stock */}
                                        {!item.available && (
                                            <span className={styles.unavailableLabel}>
                                                Unavailable
                                            </span>
                                        )}

                                        {/* Add to cart button */}
                                        {item.available && !item.lowStock &&(
                                            <button
                                                className={styles.addButton}
                                                onClick={() => addItem(item)}
                                            >
                                                Add to Cart
                                            </button>
                                        )}

                                        {/* If low stock but still available → still allow adding */}
                                        {item.available && item.lowStock &&(
                                            <button
                                                className={styles.addButton}
                                                onClick={() => addItem(item)}
                                            >
                                                Add to Cart
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                userId={userId}
                displayName={displayName}
            />
        </Dashboard>
    );
}

export default function MenuPage() {
    return <MenuContent />;
}
