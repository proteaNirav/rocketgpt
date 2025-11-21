import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Input } from '../input';
import { Badge } from '../badge';
import { ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';

export function LogsPage() {
  const { theme } = useTheme();
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState('all');

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const logs = [
    {
      id: 1,
      timestamp: '2025-11-19 14:32:15',
      component: 'API Gateway',
      event: 'Request received',
      severity: 'info',
      details: {
        endpoint: '/api/v1/sessions/create',
        method: 'POST',
        userId: 'user_12345',
        ip: '192.168.1.100'
      }
    },
    {
      id: 2,
      timestamp: '2025-11-19 14:32:18',
      component: 'Model Engine',
      event: 'Model inference started',
      severity: 'info',
      details: {
        model: 'GPT-5',
        tokens: 1250,
        estimatedTime: '2.3s'
      }
    },
    {
      id: 3,
      timestamp: '2025-11-19 14:32:45',
      component: 'Rate Limiter',
      event: 'Rate limit warning',
      severity: 'warning',
      details: {
        userId: 'user_12345',
        currentRate: '48/60',
        threshold: '80%'
      }
    },
    {
      id: 4,
      timestamp: '2025-11-19 14:33:02',
      component: 'Database',
      event: 'Connection pool exhausted',
      severity: 'error',
      details: {
        pool: 'main_pool',
        activeConnections: 50,
        maxConnections: 50,
        waitingQueries: 12
      }
    },
    {
      id: 5,
      timestamp: '2025-11-19 14:33:15',
      component: 'Cache Manager',
      event: 'Cache hit',
      severity: 'info',
      details: {
        key: 'prompt_template_42',
        ttl: '3600s'
      }
    },
    {
      id: 6,
      timestamp: '2025-11-19 14:33:28',
      component: 'Auth Service',
      event: 'Failed login attempt',
      severity: 'warning',
      details: {
        username: 'admin',
        ip: '203.45.67.89',
        attempts: 3
      }
    },
  ];

  const getSeverityColor = (severity: string) => {
    if (severity === 'error') return 'error';
    if (severity === 'warning') return 'warning';
    return 'default';
  };

  const filteredLogs = severityFilter === 'all' 
    ? logs 
    : logs.filter(log => log.severity === severityFilter);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Search logs..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSeverityFilter('all')}
            className={`px-4 py-2 rounded-lg transition-all ${
              severityFilter === 'all'
                ? theme === 'dark' ? 'bg-[#3B82F6] text-white' : 'bg-[#2563EB] text-white'
                : theme === 'dark' ? 'bg-[#2D323C] text-[#D1D5DB]' : 'bg-[#F5F5F5] text-[#111827]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSeverityFilter('info')}
            className={`px-4 py-2 rounded-lg transition-all ${
              severityFilter === 'info'
                ? theme === 'dark' ? 'bg-[#3B82F6] text-white' : 'bg-[#2563EB] text-white'
                : theme === 'dark' ? 'bg-[#2D323C] text-[#D1D5DB]' : 'bg-[#F5F5F5] text-[#111827]'
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setSeverityFilter('warning')}
            className={`px-4 py-2 rounded-lg transition-all ${
              severityFilter === 'warning'
                ? theme === 'dark' ? 'bg-[#3B82F6] text-white' : 'bg-[#2563EB] text-white'
                : theme === 'dark' ? 'bg-[#2D323C] text-[#D1D5DB]' : 'bg-[#F5F5F5] text-[#111827]'
            }`}
          >
            Warning
          </button>
          <button
            onClick={() => setSeverityFilter('error')}
            className={`px-4 py-2 rounded-lg transition-all ${
              severityFilter === 'error'
                ? theme === 'dark' ? 'bg-[#3B82F6] text-white' : 'bg-[#2563EB] text-white'
                : theme === 'dark' ? 'bg-[#2D323C] text-[#D1D5DB]' : 'bg-[#F5F5F5] text-[#111827]'
            }`}
          >
            Error
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <tr>
                <th className={`px-6 py-3 text-left ${textPrimary} w-8`}></th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Timestamp</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Component</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Event</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr 
                    className={`cursor-pointer ${theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td className="px-6 py-4">
                      {expandedLog === log.id ? (
                        <ChevronDown className={`w-4 h-4 ${textSecondary}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                      )}
                    </td>
                    <td className={`px-6 py-4 ${textSecondary} font-mono text-sm`}>
                      {log.timestamp}
                    </td>
                    <td className={`px-6 py-4 ${textPrimary}`}>{log.component}</td>
                    <td className={`px-6 py-4 ${textPrimary}`}>{log.event}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className={theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F9FAFB]'}>
                      <td colSpan={5} className="px-6 py-4">
                        <div className={`p-4 rounded-lg font-mono text-sm ${theme === 'dark' ? 'bg-[#1A1D24]' : 'bg-white'}`}>
                          <h4 className={`mb-2 ${textPrimary}`}>Event Details:</h4>
                          <pre className={`${textSecondary} whitespace-pre-wrap`}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className={`text-sm ${textSecondary} mb-1`}>Total Logs</p>
          <h3 className={textPrimary}>{logs.length}</h3>
        </Card>
        <Card>
          <p className={`text-sm ${textSecondary} mb-1`}>Info</p>
          <h3 className={theme === 'dark' ? 'text-[#3B82F6]' : 'text-[#2563EB]'}>
            {logs.filter(l => l.severity === 'info').length}
          </h3>
        </Card>
        <Card>
          <p className={`text-sm ${textSecondary} mb-1`}>Warnings</p>
          <h3 className={theme === 'dark' ? 'text-[#FCD34D]' : 'text-[#FACC15]'}>
            {logs.filter(l => l.severity === 'warning').length}
          </h3>
        </Card>
        <Card>
          <p className={`text-sm ${textSecondary} mb-1`}>Errors</p>
          <h3 className={theme === 'dark' ? 'text-[#F87171]' : 'text-[#EF4444]'}>
            {logs.filter(l => l.severity === 'error').length}
          </h3>
        </Card>
      </div>
    </div>
  );
}
