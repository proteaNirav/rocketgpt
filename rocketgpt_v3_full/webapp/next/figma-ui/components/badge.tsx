import React from 'react';
import { useTheme } from './theme-provider';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'pending' | 'running' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const { theme } = useTheme();

  const variantStyles = {
    success: theme === 'dark' 
      ? 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20'
      : 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20',
    warning: theme === 'dark'
      ? 'bg-[#FCD34D]/10 text-[#FCD34D] border-[#FCD34D]/20'
      : 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20',
    error: theme === 'dark'
      ? 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/20'
      : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
    pending: theme === 'dark'
      ? 'bg-[#9CA3AF]/10 text-[#9CA3AF] border-[#9CA3AF]/20'
      : 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20',
    running: theme === 'dark'
      ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20'
      : 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20',
    default: theme === 'dark'
      ? 'bg-[#2D323C] text-[#D1D5DB] border-[#2D323C]'
      : 'bg-[#F5F5F5] text-[#4B5563] border-[#E5E7EB]',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
