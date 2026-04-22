"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.body.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const body = document.body;
    body.style.opacity = '0.95';
    
    setTimeout(() => {
      if (isDark) {
        body.classList.remove('dark');
        body.classList.add('light');
      } else {
        body.classList.remove('light');
        body.classList.add('dark');
      }
      body.style.opacity = '1';
    }, 150);
    
    setIsDark(!isDark);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full hover:bg-[#e2efff] dark:hover:bg-[#1a1a1a] text-[#475569] dark:text-[#c1c6d5] transition-all flex items-center justify-center ${className}`}
      aria-label="Toggle theme"
    >
      <span className="material-symbols-outlined text-xl">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
