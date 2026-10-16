import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Wordmark from './Wordmark'

// BRANDING-001: the Wordmark is real text in two colors; navy "Aulea" would be invisible on the
// navy header, so the colors depend on the surface.

describe('Wordmark (BRANDING-001)', () => {
  it('renders "Aulea" in paper and ".school" in teal on a dark surface', () => {
    // given/when: rendered for the dark header
    render(<Wordmark surface="on-dark" />)

    // then: the two parts have the on-dark colors
    expect(screen.getByText('Aulea')).toHaveClass('text-paper')
    expect(screen.getByText('.school')).toHaveClass('text-teal')
  })

  it('renders "Aulea" in navy and ".school" in dark teal on a light surface', () => {
    // given/when: rendered on the page body
    render(<Wordmark surface="on-light" />)

    // then: the two parts have the on-light colors
    expect(screen.getByText('Aulea')).toHaveClass('text-ink')
    expect(screen.getByText('.school')).toHaveClass('text-teal-700')
  })
})
