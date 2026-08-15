'use client';

import { createContext, useContext } from 'react';

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
};

export type NavGroup = {
  readonly label: string;
  readonly items: ReadonlyArray<NavItem>;
};

export type NavConfig = ReadonlyArray<NavGroup>;

const NavContext = createContext<NavConfig>([]);

export function NavProvider({ nav, children }: { nav: NavConfig; children: React.ReactNode }) {
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}

export function useNav(): NavConfig {
  return useContext(NavContext);
}
