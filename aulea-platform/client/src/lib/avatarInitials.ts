/**
 * USER-MENU-001: `SignedInUser` carries no display name, so the avatar shows
 * initials derived from the email's local part (the part before `@`).
 */
export function avatarInitials(email: string): string {
  const localPart = email.split('@')[0] ?? ''
  const alpha = localPart.match(/[a-zA-Z]/g) ?? []
  if (alpha.length >= 2) return (alpha[0] + alpha[1]).toUpperCase()
  if (localPart.length > 0) return localPart[0].toUpperCase()
  return ''
}
