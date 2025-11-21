import React from 'react';
import { useTheme } from './theme-provider';
import { Card } from './card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  chart?: React.ReactNode;
}

export function StatCard({ title, value, icon: Icon, trend, chart }: StatCardProps) {
  const { theme } = useTheme();

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';
  const iconBg = theme === 'dark' ? 'bg-[#3B82F6]/10' : 'bg-[#2563EB]/10';
  const iconColor = theme === 'dark' ? 'text-[#3B82F6]' : 'text-[#2563EB]';

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className={`text-sm ${textSecondary} mb-1`}>{title}</p>
          <h3 className={textPrimary}>{value}</h3>
          {trend && (
            <p className={`text-sm mt-1 ${trend.positive ? (theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]') : (theme === 'dark' ? 'text-[#F87171]' : 'text-[#EF4444]')}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      {chart && <div className="mt-4">{chart}</div>}
    </Card>
  );
}
