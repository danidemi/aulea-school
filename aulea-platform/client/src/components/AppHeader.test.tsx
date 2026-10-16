import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppHeader from './AppHeader'

// BRANDING-001: the header shows the icon and the Wordmark, links home, and has no Tagline.

describe('AppHeader (BRANDING-001)', () => {
  it('shows the Wordmark linking to home, with no "Learning Platform" and no tagline', () => {
    // given/when: the header renders for an unregistered user
    render(<AppHeader user={null} />)

    // then: the brand link shows the Wordmark; the old name and the tagline are absent
    const link = screen.getByRole('link', { name: 'Aulea.school' })
    expect(link).toHaveAttribute('href', '/')
    expect(link.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('banner')).not.toHaveTextContent(/learning platform/i)
    expect(screen.getByRole('banner')).not.toHaveTextContent(/ai authoring/i)
  })
})
