import { describe, it, expect } from 'vitest'
import { slugify, formatDateTime, formatDate, toDateStr } from '@/lib/utils'

describe('slugify', () => {
  it('converts basic text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('handles special characters', () => {
    expect(slugify('Čelić: Premijer liga 2025!')).toMatch(/^[a-z0-9-]+$/)
  })
  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
  it('trims trailing hyphens', () => {
    expect(slugify('test---')).toBe('test')
  })
})

describe('formatDateTime', () => {
  it('formats date correctly', () => {
    const result = formatDateTime(new Date('2025-06-15T10:00:00Z'))
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})

describe('formatDate', () => {
  it('formats date correctly', () => {
    const result = formatDate(new Date('2025-06-15T10:00:00Z'))
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
  it('handles null/undefined gracefully', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})

describe('toDateStr', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = toDateStr(new Date(2025, 5, 15)) // June 15 (month is 0-indexed)
    expect(result).toBe('2025-06-15')
  })
  it('uses local date not UTC', () => {
    const d = new Date('2025-06-15T00:30:00+02:00')
    const result = toDateStr(d)
    expect(result).toBe('2025-06-15')
  })
})
