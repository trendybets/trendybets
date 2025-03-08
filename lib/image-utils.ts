/**
 * Utility functions for image handling
 */

/**
 * Handles image loading errors by replacing the source with a placeholder
 * @param event The error event from the image
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = event.target as HTMLImageElement;
  target.src = '/placeholder-player.svg';
  target.onerror = null; // Prevent infinite error loop
}

/**
 * Checks if a URL is valid
 * @param url The URL to check
 * @returns True if the URL is valid, false otherwise
 */
export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gets a safe image URL, returning a placeholder if the URL is invalid
 * @param url The URL to check
 * @returns A safe URL or placeholder
 */
export function getSafeImageUrl(url: string | undefined | null): string {
  return isValidImageUrl(url) ? url! : '/placeholder-player.svg';
} 