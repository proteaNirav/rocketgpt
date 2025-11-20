import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon, Bell, User } from 'lucide-react';
import { Button } from './button';

interface NavbarProps {
  title: string;
  subtitle?: string;
}

export function Navbar({ title, subtitle }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  const bgColor = theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-[#2D323C]' : 'border-[#E5E7EB]';
  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  return (
    <div className={`h-16 ${bgColor} border-b ${borderColor} flex items-center justify-between px-8`}>
      <div>
        <h1 className={textPrimary}>{title}</h1>
        {subtitle && <p className={`text-sm ${textSecondary}`}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        
        <Button variant="ghost" size="sm">
          <Bell className="w-5 h-5" />
        </Button>

        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`}>
          <User className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
