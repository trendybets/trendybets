/**
 * Format hit rate as a percentage
 * @param rate Hit rate as a decimal (0-1)
 * @returns Formatted string with percentage
 */
export function formatHitRate(rate: number): string {
  const percentage = Math.round(rate * 100);
  return `${percentage}%`;
}

/**
 * Format betting odds in American format
 * @param odds Odds value (positive for favorites, negative for underdogs)
 * @returns Formatted odds string with sign
 */
export function formatOdds(odds: number): string {
  // Check if odds is a valid number
  if (typeof odds !== 'number' || isNaN(odds)) {
    return '-';
  }
  
  // For positive odds (underdogs)
  if (odds > 0) {
    return `+${odds}`;
  }
  
  // For negative odds (favorites)
  return `${odds}`;
}

/**
 * Format value with sign
 * @param value Numeric value
 * @returns Formatted string with sign (+ for positive, - for negative)
 */
export function formatWithSign(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '-';
  }
  
  if (value > 0) {
    return `+${value.toFixed(1)}`;
  }
  
  return value.toFixed(1);
}

/**
 * Format date to readable string
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Format currency value
 * @param value Number to format as currency
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
} 