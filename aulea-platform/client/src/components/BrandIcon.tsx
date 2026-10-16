/** The Aulea icon (BRANDING-001), inline so it needs no request. Same shapes as `public/icon.svg`. */
function BrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 416 416" aria-hidden="true" focusable="false" className={className}>
      <rect x="7" y="7" width="402" height="402" rx="68" fill="#1E2A44" stroke="#12A58B" strokeWidth="14" />
      <path
        d="M104 128 L190 202 L104 278"
        fill="none"
        stroke="#12A58B"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="212" y="269" width="108" height="31" rx="5" fill="#12A58B" />
      <path
        d="M270 80 C275 112 296 132 328 141 C296 150 275 170 270 206 C265 170 244 150 212 141 C244 132 265 112 270 80 Z"
        fill="#FBAB22"
      />
    </svg>
  )
}

export default BrandIcon
