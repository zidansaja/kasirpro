import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as Indonesian Rupiah currency
 * @param amount - The number to format
 * @param options - Optional: { minimumFractionDigits: 0 (default) | 2 }
 */
export function formatRupiah(amount: number, options?: { minimumFractionDigits?: number }): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(amount)
}

/**
 * Format a date string to Indonesian locale display
 * @param dateStr - ISO date string
 * @param fmt - date-fns format string (default: 'dd MMM yyyy')
 */
export function formatDate(dateStr: string, fmt?: string): string {
  try {
    return format(new Date(dateStr), fmt || 'dd MMM yyyy', { locale: idLocale })
  } catch {
    return dateStr
  }
}

/**
 * Format a date string with time in Indonesian locale
 * @param dateStr - ISO date string
 * @param fmt - date-fns format string (default: 'dd MMM yyyy, HH:mm')
 */
export function formatDateTime(dateStr: string, fmt?: string): string {
  try {
    return format(new Date(dateStr), fmt || 'dd MMM yyyy, HH:mm', { locale: idLocale })
  } catch {
    return dateStr
  }
}

/**
 * Get full Indonesian day and date
 * @param dateStr - ISO date string (default: now)
 */
export function formatFullDate(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date()
    return format(d, 'EEEE, dd MMM yyyy', { locale: idLocale })
  } catch {
    return dateStr || ''
  }
}

/**
 * Get time with seconds in WIB timezone format
 * @param dateStr - ISO date string (default: now)
 */
export function formatTime(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date()
    return format(d, 'HH:mm:ss', { locale: idLocale })
  } catch {
    return ''
  }
}

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/**
 * Generate CSV content string with BOM for UTF-8 Excel compatibility
 */
export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell)
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(','))
  ].join('\n')
  return '\uFEFF' + csvContent // BOM prefix for UTF-8
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
