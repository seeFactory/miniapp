import React, { useEffect } from 'react';
import { applyThemePreference, getThemePreference } from './lib';
import './app.css';

export default function App({ children }) {
  useEffect(() => {
    const applyStoredTheme = () => applyThemePreference(getThemePreference());
    applyStoredTheme();
    if (typeof window === 'undefined') return undefined;

    const media =
      window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleSystemTheme = () => {
      if (getThemePreference() === 'system') applyStoredTheme();
    };

    window.addEventListener?.('sf-theme-change', applyStoredTheme);
    media?.addEventListener?.('change', handleSystemTheme);
    return () => {
      window.removeEventListener?.('sf-theme-change', applyStoredTheme);
      media?.removeEventListener?.('change', handleSystemTheme);
    };
  }, []);

  return children;
}
