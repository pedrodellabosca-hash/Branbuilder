import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text
    return text.slice(0, length) + '...'
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if code is running on server
 */
export function isServer(): boolean {
    return typeof window === 'undefined'
}

/**
 * Parse environment variable as boolean
 */
export function envBool(key: string, defaultValue = false): boolean {
    const value = process.env[key]
    if (value === undefined) return defaultValue
    return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Parse environment variable as number
 */
export function envNumber(key: string, defaultValue: number): number {
    const value = process.env[key]
    if (value === undefined) return defaultValue
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
}
