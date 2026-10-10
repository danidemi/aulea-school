import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * UI-FOUNDATION-001: one input style for every text/email/password field
 * on the site. Default/hover/focus/disabled states per the consistency
 * checklist.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded border border-border bg-white px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-600/40',
        'hover:border-ink-600/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:border-brass',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
