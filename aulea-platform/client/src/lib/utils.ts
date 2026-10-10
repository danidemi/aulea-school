import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Standard shadcn/ui helper: merges conditional class lists (`clsx`) and
 * resolves conflicting Tailwind utility classes so the last one wins
 * (`tailwind-merge`) — e.g. `cn('px-2', condition && 'px-4')` yields
 * `'px-4'`, not both.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
