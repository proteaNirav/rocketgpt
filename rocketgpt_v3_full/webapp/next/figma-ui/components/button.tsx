import React from 'react';
import { useTheme } from './theme-provider';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const { theme } = useTheme();

  const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  };

  const variantStyles = {
    primary: theme === 'dark' 
      ? 'bg-[#3B82F6] hover:bg-[#60A5FA] text-white'
      : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white',
    secondary: theme === 'dark'
      ? 'bg-[#2D323C] hover:bg-[#3d4452] text-[#D1D5DB] border border-[#2D323C]'
      : 'bg-[#F5F5F5] hover:bg-[#E5E7EB] text-[#111827] border border-[#E5E7EB]',
    destructive: theme === 'dark'
      ? 'bg-[#F87171] hover:bg-[#EF4444] text-white'
      : 'bg-[#EF4444] hover:bg-[#DC2626] text-white',
    ghost: theme === 'dark'
      ? 'hover:bg-[#1A1D24] text-[#D1D5DB]'
      : 'hover:bg-[#F5F5F5] text-[#111827]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
