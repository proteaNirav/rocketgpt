import React from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Badge } from '../badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PlansPage() {
  const { theme } = useTheme();

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const usageData = [
    { time: '00:00', requests: 120 },
    { time: '04:00', requests: 80 },
    { time: '08:00', requests: 340 },
    { time: '12:00', requests: 520 },
    { time: '16:00', requests: 480 },
    { time: '20:00', requests: 290 },
  ];

  const limits = [
    { metric: 'Requests per minute', current: 45, limit: 60, unit: 'req/min' },
    { metric: 'Requests per hour', current: 2847, limit: 3000, unit: 'req/hr' },
    { metric: 'Tokens per day', current: 89420, limit: 100000, unit: 'tokens' },
    { metric: 'Concurrent sessions', current: 7, limit: 10, unit: 'sessions' },
  ];

  const models = [
    { name: 'GPT-5', available: true, rateLimit: '60/min', costPer1k: '$0.03' },
    { name: 'Claude 3', available: true, rateLimit: '50/min', costPer1k: '$0.025' },
    { name: 'Gemini Pro', available: true, rateLimit: '40/min', costPer1k: '$0.02' },
    { name: 'GPT-4 Turbo', available: false, rateLimit: '-', costPer1k: '-' },
    { name: 'Local LLaMA', available: true, rateLimit: '100/min', costPer1k: 'Free' },
  ];

  const getPercentage = (current: number, limit: number) => {
    return Math.round((current / limit) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <Badge variant="running" className="mb-2">Professional Plan</Badge>
            <h3 className={textPrimary}>Current Subscription</h3>
            <p className={textSecondary}>Renews on December 15, 2025</p>
          </div>
          <div className="text-right">
            <p className={`text-sm ${textSecondary}`}>Monthly Cost</p>
            <h2 className={textPrimary}>$99.00</h2>
          </div>
        </div>
      </Card>

      {/* Rate Limits */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>Rate Limits & Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {limits.map((limit) => {
            const percentage = getPercentage(limit.current, limit.limit);
            return (
              <div key={limit.metric} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className={textPrimary}>{limit.metric}</p>
                    <p className={`text-sm ${textSecondary}`}>
                      {limit.current.toLocaleString()} / {limit.limit.toLocaleString()} {limit.unit}
                    </p>
                  </div>
                  <Badge variant={percentage > 80 ? 'warning' : 'success'}>
                    {percentage}%
                  </Badge>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-[#2D323C]' : 'bg-[#E5E7EB]'}`}>
                  <div 
                    className={`h-full transition-all ${
                      percentage > 80 
                        ? theme === 'dark' ? 'bg-[#FCD34D]' : 'bg-[#FACC15]'
                        : theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Usage Graph */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>24-Hour Usage Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageData}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme === 'dark' ? '#3B82F6' : '#2563EB'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme === 'dark' ? '#3B82F6' : '#2563EB'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D323C' : '#E5E7EB'} />
              <XAxis dataKey="time" stroke={theme === 'dark' ? '#6B7280' : '#9CA3AF'} />
              <YAxis stroke={theme === 'dark' ? '#6B7280' : '#9CA3AF'} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1A1D24' : '#FFFFFF',
                  border: `1px solid ${theme === 'dark' ? '#2D323C' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  color: theme === 'dark' ? '#F9FAFB' : '#111827'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="requests" 
                stroke={theme === 'dark' ? '#3B82F6' : '#2563EB'} 
                fillOpacity={1} 
                fill="url(#colorRequests)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Model Availability */}
      <Card className="overflow-hidden p-0">
        <div className="p-6 border-b border-inherit">
          <h3 className={textPrimary}>Model Availability</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <tr>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Model</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Status</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Rate Limit</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Cost per 1K tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {models.map((model) => (
                <tr key={model.name} className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                  <td className={`px-6 py-4 ${textPrimary}`}>{model.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {model.available ? (
                        <>
                          <CheckCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'}`} />
                          <span className={theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'}>Available</span>
                        </>
                      ) : (
                        <>
                          <XCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-[#F87171]' : 'text-[#EF4444]'}`} />
                          <span className={theme === 'dark' ? 'text-[#F87171]' : 'text-[#EF4444]'}>Unavailable</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${textSecondary}`}>{model.rateLimit}</td>
                  <td className={`px-6 py-4 ${textSecondary}`}>{model.costPer1k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
