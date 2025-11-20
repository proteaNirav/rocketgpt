import React from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { StatCard } from '../stat-card';
import { Badge } from '../badge';
import { Activity, Gauge, FileText, MessageSquare, Circle, Clock } from 'lucide-react';

export function DashboardPage() {
  const { theme } = useTheme();

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const aiEngines = [
    { name: 'GPT-5', status: 'online', latency: '120ms' },
    { name: 'Claude', status: 'online', latency: '95ms' },
    { name: 'Gemini', status: 'degraded', latency: '340ms' },
    { name: 'Local Engine', status: 'offline', latency: 'N/A' },
  ];

  const recentActivity = [
    { id: 1, action: 'Session created', user: 'John Doe', time: '2 mins ago', type: 'session' },
    { id: 2, action: 'Prompt saved', user: 'Jane Smith', time: '5 mins ago', type: 'prompt' },
    { id: 3, action: 'Runbook executed', user: 'Mike Johnson', time: '12 mins ago', type: 'runbook' },
    { id: 4, action: 'Model switched', user: 'Sarah Williams', time: '18 mins ago', type: 'config' },
    { id: 5, action: 'API limit reached', user: 'System', time: '25 mins ago', type: 'warning' },
  ];

  const openSessions = [
    { id: 1, title: 'Code Review Assistant', messages: 24, updated: '5 mins ago', model: 'GPT-5' },
    { id: 2, title: 'Bug Analysis', messages: 12, updated: '15 mins ago', model: 'Claude' },
    { id: 3, title: 'Documentation Writer', messages: 8, updated: '1 hour ago', model: 'Gemini' },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'online') return 'success';
    if (status === 'degraded') return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="System Health"
          value="98.5%"
          icon={Activity}
          trend={{ value: '2.5%', positive: true }}
        />
        <StatCard
          title="Rate Limits Usage"
          value="3,247"
          icon={Gauge}
          trend={{ value: '12%', positive: false }}
        />
        <StatCard
          title="Prompts Count"
          value="142"
          icon={FileText}
          trend={{ value: '8 new', positive: true }}
        />
        <StatCard
          title="Active Sessions"
          value="7"
          icon={MessageSquare}
          trend={{ value: '3 today', positive: true }}
        />
      </div>

      {/* Recent Activity & Open Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <h3 className={`mb-4 ${textPrimary}`}>Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-inherit last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'warning' 
                    ? theme === 'dark' ? 'bg-[#FCD34D]' : 'bg-[#FACC15]'
                    : theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={textPrimary}>{activity.action}</p>
                  <p className={`text-sm ${textSecondary}`}>{activity.user}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className={`w-3 h-3 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Open Sessions */}
        <Card>
          <h3 className={`mb-4 ${textPrimary}`}>Open Sessions</h3>
          <div className="space-y-3">
            {openSessions.map((session) => (
              <div key={session.id} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className={textPrimary}>{session.title}</h4>
                  <Badge variant="running">{session.model}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${textSecondary}`}>{session.messages} messages</span>
                  <span className={`text-sm ${textSecondary}`}>•</span>
                  <span className={`text-sm ${textSecondary}`}>{session.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Engine Status Panel */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>AI Engine Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiEngines.map((engine) => (
            <div 
              key={engine.name} 
              className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#0D0F14] border-[#2D323C]' : 'bg-[#F5F5F5] border-[#E5E7EB]'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Circle className={`w-3 h-3 fill-current ${
                  engine.status === 'online' 
                    ? theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'
                    : engine.status === 'degraded'
                    ? theme === 'dark' ? 'text-[#FCD34D]' : 'text-[#FACC15]'
                    : theme === 'dark' ? 'text-[#F87171]' : 'text-[#EF4444]'
                }`} />
                <h4 className={textPrimary}>{engine.name}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(engine.status)}>
                  {engine.status}
                </Badge>
                <span className={`text-xs ${textSecondary}`}>{engine.latency}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
