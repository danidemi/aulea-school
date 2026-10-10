import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * UI-FOUNDATION-001's signature element: every form-carrying panel (sign
 * in, sign up) reads as a library/course-catalog index card rather than a
 * generic centered white box — a brass spine down the left edge and a
 * folded top-right corner, echoing the course-authoring subject matter
 * this platform is actually for.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-card border border-border bg-white pl-8 pr-6 py-8 shadow-sm',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2 bg-brass" />
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 h-6 w-6 bg-paper shadow-[-1px_1px_2px_rgba(30,42,68,0.15)]"
        style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
      />
      {children}
    </div>
  ),
)
Card.displayName = 'Card'

export { Card }
