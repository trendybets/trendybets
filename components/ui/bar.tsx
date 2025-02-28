interface BarProps {
  value: number
  maxValue: number
  color?: string
  label?: string
}

export function Bar({ value, maxValue, color = 'bg-blue-500', label }: BarProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="flex-1">
      <div className="relative h-full">
        <div
          className={`absolute bottom-0 w-full ${color} rounded-t transition-all duration-300`}
          style={{ height: `${percentage}%` }}
        >
          {label && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 