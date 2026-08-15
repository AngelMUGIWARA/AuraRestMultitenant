import { useState, useEffect } from 'react';

function IconSun({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;
}
function IconMoon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>;
}

// Self-contained — no ThemeContext needed. Inherits dark class from shell's <html>.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')); }, []);
  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    try { localStorage.setItem('maison-theme', next ? 'dark' : 'light'); } catch {}
  }
  return (
    <button type="button" onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      {isDark ? <IconSun className="h-3.5 w-3.5" /> : <IconMoon className="h-3.5 w-3.5" />}
    </button>
  );
}
