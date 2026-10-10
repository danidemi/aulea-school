import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * TABLE-STYLE-001: the app's one shared table style — copied in per
 * ADR-0006, tokens swapped for this project's own palette. Bakes in every
 * decision made at grooming/planning: full width, a left accent bar
 * (echoing `Card`'s own brass spine — the sessions table's old `<Card>`
 * wrapper is replaced by this baked-in bar, not kept alongside it), a
 * light-gray/bold header, zebra-striped body rows, and the sessions
 * table's padding.
 */
const Table = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('relative overflow-hidden rounded-card border border-border bg-white', className)} {...props}>
    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2 bg-brass" />
    <table className="w-full border-collapse pl-2 text-left text-sm">{children}</table>
  </div>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-ink-50 text-ink', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={className} {...props} />
))
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn('even:bg-ink-50', className)} {...props} />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn('px-4 py-2 font-medium', className)} {...props} />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('px-4 py-2', className)} {...props} />
))
TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
