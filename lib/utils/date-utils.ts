/**
 * Formats a date object into a human-readable string
 * Example: "Mon, Jan 1, 10:00 AM EST"
 */
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
 * Formats a date for display in a compact format
 * Example: "Jan 1"
 */
export function formatCompactDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

/**
 * Formats a time for display
 * Example: "10:00 AM"
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
} 