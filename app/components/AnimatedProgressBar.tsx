'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedProgressBarProps {
  value: number;
  maxValue?: number;
  label?: string;
  height?: number;
  colorScheme?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  showValueText?: boolean;
  valueFormatter?: (value: number) => string;
}

const AnimatedProgressBar = ({ 
  value, 
  maxValue = 100, 
  label, 
  height = 8,
  colorScheme = 'default',
  className = '',
  showValueText = true,
  valueFormatter = (value: number) => `${value}%`
}: AnimatedProgressBarProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = (value / maxValue) * 100;
  
  useEffect(() => {
    // Animate the value
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  // Determine color based on scheme and value
  const getBarColor = () => {
    if (colorScheme === 'success') return 'bg-green-500 dark:bg-green-600';
    if (colorScheme === 'warning') return 'bg-yellow-500 dark:bg-yellow-600';
    if (colorScheme === 'danger') return 'bg-red-500 dark:bg-red-600';
    
    // Default color scheme based on value
    if (percentage > 70) return 'bg-green-500 dark:bg-green-600';
    if (percentage > 50) return 'bg-blue-500 dark:bg-blue-600';
    if (percentage > 40) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-red-500 dark:bg-red-600';
  };
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          {showValueText && (
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {valueFormatter(displayValue)}
            </span>
          )}
        </div>
      )}
      <div 
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div 
          className={`h-full rounded-full ${getBarColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export default AnimatedProgressBar; 