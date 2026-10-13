"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ShellState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** Product filter narrows portfolio views; it never changes authorization scope (spec §7). */
  productFilter: string;
  setProductFilter: (productId: string) => void;
}

const ShellContext = createContext<ShellState | null>(null);

const STORAGE_KEYS = { collapsed: "ap.sidebar.collapsed", product: "ap.product.filter" };

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, policy); preferences then last for the session.
  }
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [productFilter, setProductFilterState] = useState("all");

  // Restore per-viewer preferences after hydration so server and client markup match.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser storage */
    setSidebarCollapsed(readStorage(STORAGE_KEYS.collapsed) === "true");
    setProductFilterState(readStorage(STORAGE_KEYS.product) ?? "all");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      writeStorage(STORAGE_KEYS.collapsed, String(!collapsed));
      return !collapsed;
    });
  }, []);

  const setProductFilter = useCallback((productId: string) => {
    setProductFilterState(productId);
    writeStorage(STORAGE_KEYS.product, productId);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    // Signals that keyboard shortcuts are live; browser tests wait for it.
    document.documentElement.dataset.shellReady = "true";
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      paletteOpen,
      setPaletteOpen,
      productFilter,
      setProductFilter,
    }),
    [sidebarCollapsed, toggleSidebar, mobileNavOpen, paletteOpen, productFilter, setProductFilter],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside ShellProvider");
  return context;
}
