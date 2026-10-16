import Wordmark from './Wordmark'

export const TAGLINE = 'AI authoring for human teachers'

/** Large `Wordmark` with the `Tagline` underneath; shown on the login and home pages only (BRANDING-001). */
function BrandBlock() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Wordmark surface="on-light" className="text-5xl" />
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagline sm:text-sm">{TAGLINE}</p>
    </div>
  )
}

export default BrandBlock
