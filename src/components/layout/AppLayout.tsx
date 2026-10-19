import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../common/ToastContainer';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Area */}
      <div className="main-wrapper">
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className="content-body">{children}</main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
