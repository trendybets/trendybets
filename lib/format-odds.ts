export function formatOdds(value: number | null | undefined): string {
  if (value == null) return '-'
  
  if (value > 0) {
    return `+${value}`
  }
  return value.toString()
} 