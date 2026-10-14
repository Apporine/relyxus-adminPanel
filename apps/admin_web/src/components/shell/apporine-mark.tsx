"use client";

import { useId } from "react";

/** Apporine logo mark. Decorative; the product name always appears beside it. */
export function ApporineMark({ className }: { className?: string }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8a63ff" />
          <stop offset="1" stopColor="var(--ap-violet)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradient})`} />
      <path d="M16 7 25 25h-4.2L16 15.4 11.2 25H7L16 7Z" fill="#fff" />
      <circle cx="16" cy="22" r="2.2" fill="var(--ap-cyan)" />
    </svg>
  );
}
