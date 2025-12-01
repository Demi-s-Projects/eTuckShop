"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import LogoutButton from "@/components/LogoutButton";
import type { MenuItem } from "@/types/MenuItem";
import styles from "@/styles/Menu.module.css";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";

// Sample menu items - in production, these would come from Firestore
const MENU_ITEMS: MenuItem[] = [
    // Snacks
    {
        id: "snack-1",
        name: "Chips",
        description: "Crispy potato chips, assorted flavors",
        price: 1.50,
        category: "Snacks",
        available: true,
    },
    {
        id: "snack-2",
        name: "Chocolate Bar",
        description: "Delicious milk chocolate bar",
        price: 2.00,
        category: "Snacks",
        available: true,
    },
    {
        id: "snack-3",
        name: "Cookies",
        description: "Fresh baked chocolate chip cookies (3 pack)",
        price: 2.50,
        category: "Snacks",
        available: true,
    },
    {
        id: "snack-4",
        name: "Granola Bar",
        description: "Healthy oat and honey granola bar",
        price: 1.75,
        category: "Snacks",
        available: true,
    },
    // Drinks
    {
        id: "drink-1",
        name: "Water Bottle",
        description: "500ml purified water",
        price: 1.00,
        category: "Drinks",
        available: true,
    },
    {
        id: "drink-2",
        name: "Soda",
        description: "Assorted carbonated beverages",
        price: 1.50,
        category: "Drinks",
        available: true,
    },
    {
        id: "drink-3",
        name: "Juice Box",
        description: "100% natural fruit juice",
        price: 1.75,
        category: "Drinks",
        available: true,
    },
    {
        id: "drink-4",
        name: "Iced Tea",
        description: "Refreshing lemon iced tea",
        price: 2.00,
        category: "Drinks",
        available: false,
    },
    // Meals
    {
        id: "meal-1",
        name: "Sandwich",
        description: "Ham and cheese sandwich on fresh bread",
        price: 4.50,
        category: "Meals",
        available: true,
    },
    {
        id: "meal-2",
        name: "Hot Dog",
        description: "Classic hot dog with your choice of toppings",
        price: 3.50,
        category: "Meals",
        available: true,
    },
    {
        id: "meal-3",
        name: "Pizza Slice",
        description: "Cheesy pepperoni pizza slice",
        price: 3.00,
        category: "Meals",
        available: true,
    },
    {
        id: "meal-4",
        name: "Salad Bowl",
        description: "Fresh garden salad with dressing",
        price: 5.00,
        category: "Meals",
        available: true,
    },
];

function MenuContent() {
    const { addItem, totalItems } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [username, setUsername] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Use email or displayName as username
                setUsername(user.email || user.displayName || "Customer");
            } else {
                setUsername("Guest");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Group menu items by category
    const categories = MENU_ITEMS.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    if (loading) {
        return <div className={styles.menuContainer}>Loading...</div>;
    }

    return (
        <div className={styles.menuContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Menu</h1>
                <div className={styles.navLinks}>
                    <Link href="/customer/home" className={styles.navLink}>
                        Home
                    </Link>
                    <button
                        className={styles.cartButton}
                        onClick={() => setIsCartOpen(true)}
                    >
                        🛒 Cart
                        {totalItems > 0 && (
                            <span className={styles.cartBadge}>{totalItems}</span>
                        )}
                    </button>
                    <LogoutButton redirectTo="/login" width={100} />
                </div>
            </div>

            {Object.entries(categories).map(([category, items]) => (
                <div key={category} className={styles.categorySection}>
                    <h2 className={styles.categoryTitle}>{category}</h2>
                    <div className={styles.menuGrid}>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={`${styles.menuItem} ${!item.available ? styles.unavailable : ""}`}
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
                                    {item.category === "Meals" && "🍔"}
                                </div>
                                <h3 className={styles.menuItemName}>{item.name}</h3>
                                <p className={styles.menuItemDescription}>
                                    {item.description}
                                </p>
                                <div className={styles.menuItemFooter}>
                                    <span className={styles.menuItemPrice}>
                                        ${item.price.toFixed(2)}
                                    </span>
                                    {item.available ? (
                                        <button
                                            className={styles.addButton}
                                            onClick={() => addItem(item)}
                                        >
                                            Add to Cart
                                        </button>
                                    ) : (
                                        <span className={styles.unavailableLabel}>
                                            Unavailable
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                username={username}
            />
        </div>
    );
}

export default function MenuPage() {
    return (
        <CartProvider>
            <MenuContent />
        </CartProvider>
    );
}
