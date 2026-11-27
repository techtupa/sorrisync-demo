
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';

const Layout = ({ children, mainClassName }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <Header />
      <main className={cn('flex-1 lg:ml-[280px] p-4 sm:p-6 lg:p-8 overflow-x-hidden', mainClassName)}>
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <div className="fixed bottom-3 right-3 z-20 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm" title="Fictional data and local adapters">Portfolio edition · local demo</div>
    </div>
  );
};

export default Layout;
