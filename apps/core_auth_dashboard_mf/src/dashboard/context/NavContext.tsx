import { createContext, useContext } from 'react';
import type { NavConfig } from '../constants';

const NavContext = createContext<NavConfig>([]);

export function NavProvider({ nav, children }: { nav: NavConfig; children: React.ReactNode }) {
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}

export function useNav(): NavConfig {
  return useContext(NavContext);
}
