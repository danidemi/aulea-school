import '@fontsource-variable/outfit'
import { cn } from '../lib/utils'

interface WordmarkProps {
  /** `on-dark` for the navy header, `on-light` for the page body (ADR-0015, BRANDING-001). */
  surface: 'on-dark' | 'on-light'
  className?: string
}

/**
 * The "Aulea" + ".school" `Wordmark` as real text (selectable, themeable).
 * "Aulea" is paper on a dark surface and navy on a light one; ".school" is
 * brand teal, with a darker teal on light surfaces to keep its contrast.
 */
function Wordmark({ surface, className }: WordmarkProps) {
  const dark = surface === 'on-dark'
  return (
    <span className={cn('font-wordmark font-bold leading-none tracking-tight', className)}>
      <span className={dark ? 'text-paper' : 'text-ink'}>Aulea</span>
      <span className={dark ? 'text-teal' : 'text-teal-700'}>.school</span>
    </span>
  )
}

export default Wordmark
