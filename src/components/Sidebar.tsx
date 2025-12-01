/**
 * Sidebar Navigation Component
 * 
 * Displays the main navigation menu for the application.
 * Supports collapsible state for better screen real estate management.
 */

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/Sidebar.module.css';

interface SidebarProps {
  /** Whether the sidebar is currently collapsed */
  isCollapsed: boolean;
  /** Function to toggle the collapsed state */
  onToggle: () => void;
}

// Navigation items configuration
const navItems = [
  { icon: "🏠", label: 'Dashboard', path: '/owner/home' },
  { icon: "📊", label: 'Analytics', path: '/analytics' },
  { icon: "👥", label: 'Users', path: '/users' },
  { icon: "⚙️", label: 'Settings', path: '/settings' },
];

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  // Get current path to highlight active menu item
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>E</div>
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
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
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
