'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SidebarContextValue {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  isMobileOpen: false,
  toggleCollapsed: () => {},
  openMobile: () => {},
  closeMobile: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('maison-sidebar') === 'collapsed') setIsCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setIsMobileOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('maison-sidebar', next ? 'collapsed' : 'expanded');
      } catch {}
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMobileOpen,
        toggleCollapsed,
        openMobile: () => setIsMobileOpen(true),
        closeMobile: () => setIsMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
