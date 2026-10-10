/**
 * UI-FOUNDATION-001 / ADR-0006: design tokens for the shadcn/ui adoption.
 * These are the project's one spacing scale, one color palette, and one
 * type scale (the story's consistency checklist) — every rebuilt screen
 * pulls from here rather than inventing its own values.
 *
 * Palette rationale: a navy/paper/brass identity distinct from shadcn's
 * default slate-blue — this is a professional course-authoring tool for
 * trainers, not a consumer product, so the palette reads as a ledger/
 * course-catalog rather than a marketing site.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1E2A44',
          50: '#EEF1F6',
          100: '#D7DEE9',
          600: '#1E2A44',
          700: '#182238',
        },
        paper: '#F5F3EE',
        brass: {
          DEFAULT: '#B8862B',
          50: '#FBF3E3',
          600: '#B8862B',
          700: '#96701F',
        },
        success: {
          DEFAULT: '#2F6F4E',
          50: '#E9F3EC',
        },
        error: {
          DEFAULT: '#B23A32',
          50: '#F8E9E7',
        },
        border: '#D8D3C7',
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.4' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.5' }],
        xl: ['1.375rem', { lineHeight: '1.4' }],
        '2xl': ['1.75rem', { lineHeight: '1.3' }],
        '3xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      spacing: {
        // The project's one spacing scale (multiples of 4px), named for
        // where each is meant to be used rather than left as bare numbers.
        'field-gap': '0.75rem', // between a label and its input, or two stacked fields
        'group-gap': '1.5rem', // between fields within one form
        'section-gap': '2.5rem', // between major page sections
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        card: '0.5rem',
      },
    },
  },
  plugins: [],
}
