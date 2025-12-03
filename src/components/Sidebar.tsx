/**
 * Sidebar Navigation Component
 * 
 * Displays the main navigation menu for the application.
 * Supports collapsible state for better screen real estate management.
 * Supports role-based navigation items and theming.
 */

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/Sidebar.module.css';
import type { ThemeColor } from './Dashboard';

interface SidebarProps {
  /** Whether the sidebar is currently collapsed */
  isCollapsed: boolean;
  /** Function to toggle the collapsed state */
  onToggle: () => void;
  /** User role for role-based navigation */
  role?: string;
  /** Theme color for the sidebar */
  theme?: ThemeColor;
}

// Navigation items configuration by role
const navItemsByRole: Record<string, Array<{ icon: string; label: string; path: string }>> = {
  owner: [
    { icon: "🏠", label: 'Dashboard', path: '/owner/home' },
    { icon: "📦", label: 'Inventory', path: '/owner/inventory' },
    { icon: "📋", label: 'Orders', path: '/owner/orders' },
    { icon: "📝", label: 'Reports', path: '/owner/reports' },
    // { icon: "📊", label: 'Analytics', path: '/owner/analytics' },
    // { icon: "👥", label: 'Users', path: '/owner/users' },
    // { icon: "⚙️", label: 'Settings', path: '/owner/settings' },
  ],
  employee: [
    { icon: "🏠", label: 'Dashboard', path: '/employee/home' },
    { icon: "📋", label: 'Orders', path: '/employee/orders' },
    { icon: "📦", label: 'Inventory', path: '/employee/inventory' },
    //{ icon: "⚙️", label: 'Settings', path: '/employee/settings' },
  ],
  customer: [
    { icon: "🏠", label: 'Dashboard', path: '/customer/home' },
    { icon: "🍔", label: 'Menu', path: '/customer/menu' },
    { icon: "📋", label: 'My Orders', path: '/customer/orders' },
   // { icon: "⚙️", label: 'Settings', path: '/customer/settings' },
  ],
};

const Sidebar = ({ isCollapsed, onToggle, role = 'owner', theme = 'blue' }: SidebarProps) => {
  // Get current path to highlight active menu item
  const pathname = usePathname();
  
  // Get navigation items based on role
  const navItems = navItemsByRole[role] || navItemsByRole.owner;

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${styles[theme]}`}>
      <div className={styles.sidebarHeader}>
        <div className={`${styles.logo} ${styles[`logo${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>E</div>
        <span className={styles.title}>eTuckShop</span>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path} className={styles.navItem}>
                <Link
                  href={item.path}
                  className={`${styles.navLink} ${isActive ? styles.active : ''} ${styles[`active${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button 
        className={styles.collapseToggle}
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? "▶" : "◀"}
      </button>
    </aside>
  );
};

export default Sidebar;
