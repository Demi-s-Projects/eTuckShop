/**
 * TopBar Component
 * 
 * Displays the application header, including the page title,
 * mobile menu toggle, and user profile information.
 */

"use client";

import React from 'react';
import styles from '@/styles/TopBar.module.css';
import LogoutButton from './LogoutButton';
import Notifications from './Notifications';

interface TopBarProps {
  /** Callback to toggle the sidebar on mobile */
  onMenuClick?: () => void;
  /** User information to display */
  user?: {
    name: string;
    role: string;
    email?: string;
  };
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick, user }) => {
  // Generate initials from name or default to 'U'
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  return (
    <header className={styles.topBar}>
      <div className={styles.leftSection}>
        {/* Mobile Menu Toggle */}
        <button
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <h1 className={styles.pageTitle}>eTuckShop</h1>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.userInfo}>
          <div className={styles.avatar} title={user?.email}>
            {initials}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.name || 'Guest'}</span>
            <span className={styles.userRole}>{user?.role || 'Visitor'}</span>
          </div>
        </div>
        
        {/* Reusing the LogoutButton component */}
        <div className={styles.logoutWrapper}>
          <Notifications />
          <span style={{ marginLeft: 8 }} />
          <LogoutButton width="auto" className={styles.logoutButton} />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
