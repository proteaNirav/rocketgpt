import React from 'react';
import { useTheme } from './theme-provider';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const { theme } = useTheme();

  const cardStyles = theme === 'dark'
    ? 'bg-[#1A1D24] border-[#2D323C]'
    : 'bg-white border-[#E5E7EB]';

  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`rounded-lg border ${cardStyles} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
