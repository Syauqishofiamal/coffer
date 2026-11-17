// ── Themes ───────────────────────────────────────────────────────────────────
// A theme is just a `data-theme` attribute on <html>; base.css holds the
// colour tokens for each one. The choice is per device (localStorage), so a
// phone and a laptop can differ and no database change is needed.

export type ThemeChoice = 'penguin' | 'night' | 'sakura' | 'auto';

export const THEMES: { id: ThemeChoice; label: string; icon: string; swatch: string[] }[] = [
  { id: 'penguin', label: 'Penguin', icon: '🐧', swatch: ['#e2ecf6', '#2d3142', '#f6b93b'] },
  { id: 'night',   label: 'Night',   icon: '🌙', swatch: ['#11141c', '#8fc1ea', '#f6b93b'] },
  { id: 'sakura',  label: 'Sakura',  icon: '🌸', swatch: ['#fbe9ef', '#b0466e', '#f6b93b'] },
  { id: 'auto',    label: 'Auto',    icon: '🔁', swatch: ['#e2ecf6', '#11141c', '#f6b93b'] },
];

export const THEME_KEY = 'coffer-theme';

/** Resolves 'auto' against the device setting. */
function resolve(choice: ThemeChoice): Exclude<ThemeChoice, 'auto'> {
  if (choice !== 'auto') return choice;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'penguin';
}

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v && THEMES.some((t) => t.id === v)) return v as ThemeChoice;
  } catch { /* storage blocked: fall through */ }
  return 'penguin';
}

export function setThemeChoice(choice: ThemeChoice): void {
  try { localStorage.setItem(THEME_KEY, choice); } catch { /* not persisted */ }
  document.documentElement.dataset.theme = resolve(choice);
}

/**
 * Runs in <head> before first paint so the page never flashes the wrong
 * theme. Kept as a string because it executes before React loads.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}')||'penguin';` +
  `if(t==='auto')t=matchMedia('(prefers-color-scheme: dark)').matches?'night':'penguin';` +
  `document.documentElement.dataset.theme=t}catch(e){}`;
