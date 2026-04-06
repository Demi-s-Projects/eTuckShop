/**
 * Menu Context Provider
 * 
 * Provides cached menu items across the customer-facing application.
 * Fetches inventory data once and caches it to prevent loading delays
 * when navigating between pages.
 * 
 * Features:
 * - Single fetch of inventory items on first load
 * - Cached data persists across page navigation
 * - Manual refresh capability for updates
 * - Loading and error states
 */

"use client";
import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { MenuItem } from "@/types/MenuItem";
import type { InventoryItem } from "@/app/api/inventory/inventory";
import { MenuStateManager } from "@/state-managers/menu/MenuStateManager";

/** Shape of the menu context value */
interface MenuContextType {
    /** Array of menu items */
    menuItems: MenuItem[];
    /** Whether the initial load is in progress */
    loading: boolean;
    /** Error message if fetch failed */
    error: string | null;
    /** Refresh menu items from the database */
    refreshMenu: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const menuManager = useMemo(() => new MenuStateManager(), []);

    const fetchMenuItems = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const ref = collection(db, "inventory");
            const snapshot = await getDocs(ref);

            const fetched: MenuItem[] = snapshot.docs.map((doc) =>
                menuManager.mapInventoryDoc(doc.id, doc.data() as InventoryItem)
            );

            setMenuItems(fetched);
            setHasFetched(true);
        } catch (err) {
            console.error("Error loading menu items:", err);
            setError(err instanceof Error ? err.message : "Failed to load menu");
        } finally {
            setLoading(false);
        }
    }, [menuManager]);

    // Fetch on mount only if we haven't fetched yet
    useEffect(() => {
        if (!hasFetched) {
            fetchMenuItems();
        }
    }, [hasFetched, fetchMenuItems]);

    const refreshMenu = useCallback(async () => {
        await fetchMenuItems();
    }, [fetchMenuItems]);

    return (
        <MenuContext.Provider value={{ menuItems, loading, error, refreshMenu }}>
            {children}
        </MenuContext.Provider>
    );
}

/**
 * Hook to access menu items and state
 */
export function useMenu() {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error("useMenu must be used within a MenuProvider");
    }
    return context;
}
