import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatDate(date: string | Date | null, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy h:mm a')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function dueDateLabel(date: string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isPast(d)) return `Overdue (${format(d, 'dd/MM')})`
  return format(d, 'dd/MM')
}

export function formatCurrency(value: number | null, currency = 'INR'): string {
  if (value === null) return '—'
  const localeMap: Record<string, string> = {
    INR: 'en-IN', USD: 'en-US', AED: 'ar-AE',
    GBP: 'en-GB', EUR: 'de-DE', SGD: 'en-SG',
  }
  return new Intl.NumberFormat(localeMap[currency] ?? 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.slice(0, length) + '…' : text
}
