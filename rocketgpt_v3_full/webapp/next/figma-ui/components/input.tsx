import React from 'react';
import { useTheme } from './theme-provider';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const { theme } = useTheme();

  const inputStyles = theme === 'dark'
    ? 'bg-[#1A1D24] border-[#2D323C] text-[#F9FAFB] placeholder:text-[#6B7280] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
    : 'bg-white border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-[#2563EB]';

  const labelStyles = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={`text-sm font-medium ${labelStyles}`}>
          {label}
        </label>
      )}
      <input
        className={`px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${inputStyles} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-sm text-[#EF4444]">{error}</span>
      )}
    </div>
  );
}
