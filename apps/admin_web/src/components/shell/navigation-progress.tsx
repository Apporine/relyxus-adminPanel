"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const current = () =>
  `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;

/**
 * Top progress bar for route changes. It starts the moment an internal link is clicked,
 * so there is feedback before the next screen's skeleton or data arrives, and completes
 * once the new route renders. Decorative: the route's loading state announces itself.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const location = `${pathname}?${searchParams.toString()}`;
  // Where the pending navigation started; null when nothing is pending.
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page or an in-page anchor: no navigation to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      setFrom(current());
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (from === null) return null;
  const done = from !== location;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-(--z-toast) h-0.5"
    >
      <div
        key={done ? "done" : "loading"}
        onAnimationEnd={done ? () => setFrom(null) : undefined}
        className={
          done
            ? "h-full animate-nav-done bg-linear-to-r from-violet to-cyan"
            : "h-full animate-nav-progress bg-linear-to-r from-violet to-cyan"
        }
      />
    </div>
  );
}
