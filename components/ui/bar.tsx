'use client'

interface BarProps {
  value: number
  maxValue: number
  color?: string
  label?: string
}

export function Bar({ value, maxValue, color = 'bg-blue-500', label }: BarProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="w-full">
      {label && <div className="text-xs text-gray-500 mb-1">{label}</div>}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>{value}</span>
        <span>{maxValue}</span>
      </div>
    </div>
  )
} 