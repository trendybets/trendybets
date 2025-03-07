import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date)
}

/**
 * Normalizes a team name for consistent comparison by:
 * - Converting to lowercase
 * - Removing spaces, periods, and hyphens
 * - Removing leading "the"
 */
export function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/\./g, '')  // Remove periods
    .replace(/-/g, '')   // Remove hyphens
    .replace(/^the/i, ''); // Remove leading "the"
}

/**
 * Normalizes a player ID for consistent lookup by converting to uppercase
 */
export function normalizePlayerId(id: string): string {
  if (!id) return '';
  return id.toUpperCase(); // Convert to uppercase for consistency
}
