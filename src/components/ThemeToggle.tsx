'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-9 w-[104px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100/50 p-0.5 dark:border-white/[0.08] dark:bg-black/40" />
    );
  }

  return (
    <div
      className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 shadow-2xs backdrop-blur-md dark:border-white/[0.08] dark:bg-black/40"
      role="radiogroup"
      aria-label="Thème d'affichage"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex h-7 w-8 items-center justify-center rounded-lg transition-all ${
          theme === 'light'
            ? 'bg-white text-amber-500 shadow-xs border border-slate-200/80 dark:bg-white/10 dark:border-transparent'
            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300'
        }`}
        title="Mode Clair"
        aria-label="Activer le mode clair"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`flex h-7 w-8 items-center justify-center rounded-lg transition-all ${
          theme === 'system'
            ? 'bg-white text-violet-600 shadow-xs border border-slate-200/80 dark:bg-white/10 dark:text-violet-400 dark:border-transparent'
            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300'
        }`}
        title="Automatique (Système)"
        aria-label="Activer le mode automatique selon le système"
      >
        <Monitor className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex h-7 w-8 items-center justify-center rounded-lg transition-all ${
          theme === 'dark'
            ? 'bg-white text-indigo-500 shadow-xs border border-slate-200/80 dark:bg-white/10 dark:text-indigo-400 dark:border-transparent'
            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300'
        }`}
        title="Mode Sombre"
        aria-label="Activer le mode sombre"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
