import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the custom type scale from globals.css. Otherwise it reads
 * `text-body` as a text color and drops a real color such as `text-white`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["page-title", "section-title", "card-title", "body", "dense", "micro", "metric"] },
      ],
    },
  },
});

/** Compose class names, letting later Tailwind utilities override earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
