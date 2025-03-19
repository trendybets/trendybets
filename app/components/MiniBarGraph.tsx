'use client'

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameStats } from '../types';

interface MiniBarGraphProps {
  games: GameStats[];
  statType: string;
  line: number;
  height?: number;
  className?: string;
}

const MiniBarGraph = ({ 
  games, 
  statType, 
  line, 
  height = 40, 
  className = '' 
}: MiniBarGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Get the correct stat value based on stat type
  const getStatValue = (game: GameStats, type: string): number => {
    switch(type.toLowerCase()) {
      case 'points':
        return game.points;
      case 'assists':
        return game.assists;
      case 'rebounds':
        return game.total_rebounds;
      default:
        return 0;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas dimensions accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // If no games, draw empty state
    if (games.length === 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data', rect.width / 2, rect.height / 2);
      return;
    }
    
    // Draw bars
    const barCount = games.length;
    const barWidth = (rect.width - (barCount - 1) * 2) / barCount;
    
    // Find max value for scaling
    const values = games.map(game => getStatValue(game, statType));
    const maxValue = Math.max(...values, line * 1.2);
    
    // Draw bars in reverse order (most recent on right)
    games.forEach((game, index) => {
      const value = getStatValue(game, statType);
      const isOver = value > line;
      const barHeight = (value / maxValue) * (rect.height - 10);
      const x = (barCount - 1 - index) * (barWidth + 2); // Reverse index for most recent on right
      const y = rect.height - barHeight;
      
      // Draw bar
      ctx.fillStyle = isOver ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      ctx.beginPath();
      // Use rounded rectangle if supported
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, 2);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = isOver ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Use rounded rectangle if supported
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, 2);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.stroke();
    });
    
    // Draw line
    const lineY = rect.height - (line / maxValue) * (rect.height - 10);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(rect.width, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [games, statType, line]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`w-full ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </motion.div>
  );
};

export default MiniBarGraph; 