/**
 * Customer Menu Page
 * 
 * Displays the menu items for customers to browse and add to cart.
 * Uses the Dashboard layout with red theme for consistency.
 */

"use client";
import { useState, useEffect, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { useMenu } from "@/context/MenuContext";
import { useAuth, formatDashboardUser } from "@/context/AuthContext";
import CartSidebar from "@/components/CartSidebar";
import Dashboard from "@/components/Dashboard";
import type { MenuItem } from "@/types/MenuItem";
import styles from "@/styles/Menu.module.css";
import customerStyles from "@/styles/CustomerHome.module.css";

function MenuContent() {
    // Get cached menu items from context
    const { menuItems, loading: itemsLoading } = useMenu();
    
    // Get auth state from centralized context
    const { user: authUser, loading: authLoading } = useAuth();
    
    // Format user for Dashboard component
    const user = formatDashboardUser(authUser, "Customer");

    const { addItem, totalItems } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Filters (with localStorage persistence)
    const [search, setSearch] = useState("");
    const [filterTypes, setFilterTypes] = useState<string[]>(
    typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("filterTypes") || "[]")
        : []
    );
    const [priceSort, setPriceSort] = useState(
        typeof window !== "undefined"
        ? localStorage.getItem("priceSort") || "default"
        : "default"
    );
    const [arrivalSort, setArrivalSort] = useState(
        typeof window !== "undefined"
        ? localStorage.getItem("arrivalSort") || "default"
        : "default"
    );

    // Persist filter selections
    useEffect(() => {
        if (typeof window !== "undefined") {
        localStorage.setItem("filterTypes", JSON.stringify(filterTypes));
        localStorage.setItem("priceSort", priceSort);
        localStorage.setItem("arrivalSort", arrivalSort);
        }
    }, [filterTypes, priceSort, arrivalSort]);

    // Apply filters - memoized to prevent recalculation on unrelated state changes
    const filteredItems = useMemo(() => 
        menuItems
            .filter((item) =>
                item.name.toLowerCase().includes(search.toLowerCase())
            )
            .filter((item) =>
                filterTypes.length === 0 ? true : filterTypes.includes(item.category)
            )
            .sort((a, b) => {
                if (priceSort === "low") return a.price - b.price;
                if (priceSort === "high") return b.price - a.price;
                return 0;
            })
            .sort((a, b) => {
                if (arrivalSort === "new")
                    return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime();
                if (arrivalSort === "old")
                    return new Date(a.lastUpdated || 0).getTime() - new Date(b.lastUpdated || 0).getTime();
                return 0;
            }),
        [menuItems, search, filterTypes, priceSort, arrivalSort]
    );

     const categories = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    if (itemsLoading || authLoading) {
        return <div className={customerStyles.loadingContainer}>Loading...</div>;
    }
    return (
            <Dashboard user={user || { name: "Guest", role: "Customer" }} theme="red">

          {/*<Dashboard user={{ name: "Customer", role: "Customer" }} theme="red"> */}
        {/*</Dashboard><Dashboard user={user} theme="red"> */}
            <div className={customerStyles.container}>
                {/* FILTER BAR */}
                <div className={styles.filterBar}>

                {/* SEARCH LABEL */}
                <label className={styles.sectionLabel}>🔍 Search</label>

                <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search menu items..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {/* FILTER LABEL */}
                <label className={styles.sectionLabel}>🔽 Filter</label>

                <select
                    className={styles.filterSelect}
                    value={priceSort}
                    onChange={(e) => setPriceSort(e.target.value)}
                >
                    <option value="default">Price: Default</option>
                    <option value="low">Price: Low → High</option>
                    <option value="high">Price: High → Low</option>
                </select>

                <select
                    className={styles.filterSelect}
                    value={arrivalSort}
                    onChange={(e) => setArrivalSort(e.target.value)}
                >
                    <option value="default">Arrival: Default</option>
                    <option value="new">Newest first</option>
                    <option value="old">Oldest first</option>
                </select>

                <div className={styles.typeFilterContainer}>
                    {["Food", "Drinks", "Snacks", "Health and Wellness", "Home Care"].map((type) => {
                        const selected = filterTypes.includes(type);

                        return (
                            <button
                                key={type}
                                className={`${styles.typeButton} ${selected ? styles.activeTypeButton : ""}`}
                                onClick={() => {
                                    if (selected) {
                                        // REMOVE from selection
                                        setFilterTypes(filterTypes.filter((t) => t !== type));
                                    } else {
                                        // ADD to selection
                                        setFilterTypes([...filterTypes, type]);
                                    }
                                }}
                            >
                                {type}
                            </button>
                        );
                    })}
                </div>

                <button
                                className={styles.clearFiltersButton}
                                onClick={() => {
                                    setSearch("");
                                    setPriceSort("default");
                                    setArrivalSort("default");
                                    setFilterTypes([]);
                                    localStorage.removeItem("filterTypes");
                                    localStorage.removeItem("priceSort");
                                    localStorage.removeItem("arrivalSort");
                                }}
                            >
                                ❌ Clear All Filters
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
                                                Out of Stock
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

            {/* Floating Cart Button */}
            <button
                className={customerStyles.cartButton}
                onClick={() => setIsCartOpen(true)}
            >
                🛒 Cart
                {totalItems > 0 && (
                    <span className={customerStyles.cartBadge}>{totalItems}</span>
                )}
            </button>

            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                userId={authUser?.uid || ""}
                displayName={authUser?.displayName || "Guest"}
            />
        </Dashboard>
    );
}

export default function MenuPage() {
    return <MenuContent />;
}
