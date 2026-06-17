import { createContext, useContext } from 'react';
import { ADMIN_NAV, type NavConfig } from '../constants';

const NavContext = createContext<NavConfig>(ADMIN_NAV);

export function NavProvider({ nav, children }: { nav: NavConfig; children: React.ReactNode }) {
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>;
}

export function useNav(): NavConfig {
  return useContext(NavContext);
}
