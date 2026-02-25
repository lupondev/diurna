import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format date + time for platform UI: "25 Feb 14:30" */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

/** Format date for display; returns empty string for null/undefined */
export function formatDate(date: string | Date | null | undefined): string {
  if (date == null) return ''
  return formatDateTime(date)
}

/** URL-safe slug from title (Balkan diacritics normalized) */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'dj')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/-+$/, '') // trim trailing hyphens
    .slice(0, 100)
}

/** ISO date string YYYY-MM-DD in local timezone */
export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
