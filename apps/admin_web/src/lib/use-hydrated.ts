"use client";

import { useEffect, useState } from "react";

/**
 * True once the component has hydrated. Interactive regions expose it as
 * `data-hydrated` so browser tests act only after React handlers are attached.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the first client render
    setHydrated(true);
  }, []);
  return hydrated;
}
