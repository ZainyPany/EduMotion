import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind class names while resolving conflicts.
 *
 * Combines `clsx` (conditional class logic) with `tailwind-merge`
 * (deduplication of conflicting utility classes, e.g. `p-2` vs `p-4`).
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-ink text-white", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
