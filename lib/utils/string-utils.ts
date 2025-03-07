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

/**
 * Truncates a string to a specified length and adds an ellipsis if needed
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Capitalizes the first letter of each word in a string
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
} 