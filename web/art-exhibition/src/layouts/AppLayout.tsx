
import React from 'react';
import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';

interface AppLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
  title?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showHeader = true, 
  showNav = true,
  title = "Buddy"
}) => {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background pb-16">
      {showHeader && <AppHeader title={title} />}
      <main className="flex-1">
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};
