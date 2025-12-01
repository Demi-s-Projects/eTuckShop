/**
 * Dashboard Layout Component
 * 
 * This component provides the main layout structure for the application dashboard.
 * It integrates the Sidebar for navigation and the TopBar for user actions and branding.
 * 
 * Features:
 * - Responsive sidebar (collapsible)
 * - Fixed top bar
 * - Scrollable content area
 * - User information display
 * - Role-based theming (owner: blue, employee: green, customer: red)
 */

"use client";

import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from '@/styles/Dashboard.module.css';

export type ThemeColor = 'blue' | 'green' | 'red';

interface DashboardProps {
  children: ReactNode;
  user?: {
    name: string;
    role: string;
    email?: string;
  };
  theme?: ThemeColor;
}

const Dashboard = ({ children, user, theme = 'blue' }: DashboardProps) => {
  // State to manage the collapsed state of the sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  /**
   * Toggles the sidebar collapsed state.
   * Passed to both Sidebar (for desktop toggle) and TopBar (for mobile menu).
   */
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Determine the role for navigation items
  const role = user?.role?.toLowerCase() || 'owner';

  return (
    <div className={`${styles.dashboardContainer} ${styles[theme]}`}>
      {/* 
        Sidebar Navigation 
        Displays the main navigation links and handles the collapsed state.
      */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={handleToggleSidebar}
        role={role}
        theme={theme}
      />
      
      {/* Main Content Wrapper */}
      <div className={styles.mainContent}>
        {/* 
          Top Navigation Bar
          Displays the page title, user profile, and mobile menu toggle.
        */}
        <TopBar 
          onMenuClick={handleToggleSidebar}
          user={user}
        />
        
        {/* 
          Page Content Area
          Where the specific page content will be rendered.
        */}
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
