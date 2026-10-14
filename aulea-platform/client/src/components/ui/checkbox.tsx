import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * SESSION-DELETE-001 / ADR-0006: shadcn/ui's checkbox, copied in like the
 * rest of `client/src/components/ui/`. Radix supplies the a11y semantics
 * (`role="checkbox"`, `aria-checked`, Space to toggle).
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-ink bg-paper ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ' +
        'disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-ink data-[state=checked]:text-paper',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
