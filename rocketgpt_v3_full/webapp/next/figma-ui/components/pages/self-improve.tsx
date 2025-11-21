import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Button } from '../button';
import { Badge } from '../badge';
import { Terminal, Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export function SelfImprovePage() {
  const { theme } = useTheme();
  const [selectedIntent, setSelectedIntent] = useState(1);

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';
  const terminalBg = theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#111827]';
  const terminalText = 'text-[#4ADE80]';

  const intents = [
    { id: 1, title: 'Optimize Response Time', priority: 'high', status: 'pending' },
    { id: 2, title: 'Improve Code Quality', priority: 'medium', status: 'completed' },
    { id: 3, title: 'Enhance Error Handling', priority: 'high', status: 'in-progress' },
    { id: 4, title: 'Refactor Legacy Code', priority: 'low', status: 'pending' },
    { id: 5, title: 'Update Dependencies', priority: 'medium', status: 'pending' },
  ];

  const logs = [
    { id: 1, time: '14:32:01', message: 'Analyzing codebase structure...' },
    { id: 2, time: '14:32:03', message: 'Identifying performance bottlenecks...' },
    { id: 3, time: '14:32:05', message: 'Found 3 optimization opportunities' },
    { id: 4, time: '14:32:07', message: 'Generating improvement plan...' },
    { id: 5, time: '14:32:10', message: 'Ready for execution' },
  ];

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'error';
    if (priority === 'medium') return 'warning';
    return 'default';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') {
      return <CheckCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'}`} />;
    }
    if (status === 'in-progress') {
      return <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-[#3B82F6]' : 'text-[#2563EB]'}`} />;
    }
    return <AlertCircle className={`w-4 h-4 ${textSecondary}`} />;
  };

  return (
    <div>
      <div className="mb-6">
        <p className={textSecondary}>AI-driven system improvement and optimization</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* AI Intents */}
        <div className="col-span-3">
          <Card>
            <h3 className={`mb-4 ${textPrimary}`}>AI Intents</h3>
            <div className="space-y-2">
              {intents.map((intent) => (
                <button
                  key={intent.id}
                  onClick={() => setSelectedIntent(intent.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedIntent === intent.id
                      ? theme === 'dark' ? 'bg-[#2D323C]' : 'bg-[#F5F5F5]'
                      : theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {getStatusIcon(intent.status)}
                    <p className={`flex-1 text-sm ${textPrimary}`}>{intent.title}</p>
                  </div>
                  <Badge variant={getPriorityColor(intent.priority)} className="text-xs">
                    {intent.priority}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Improvement Detail */}
        <div className="col-span-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className={textPrimary}>Optimize Response Time</h3>
              <Badge variant="error">High Priority</Badge>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className={`text-sm mb-2 ${textPrimary}`}>Analysis</h4>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                  <p className={textSecondary}>
                    Current average response time: 340ms
                    <br />
                    Target response time: <150ms
                    <br />
                    Bottlenecks identified: 3
                  </p>
                </div>
              </div>

              <div>
                <h4 className={`text-sm mb-2 ${textPrimary}`}>Proposed Improvements</h4>
                <div className="space-y-2">
                  {[
                    'Implement query result caching',
                    'Optimize database indexes',
                    'Enable connection pooling'
                  ].map((improvement, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg flex items-center gap-3 ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}
                    >
                      <CheckCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'}`} />
                      <p className={textPrimary}>{improvement}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={`text-sm mb-2 ${textPrimary}`}>Impact Assessment</h4>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className={`text-xs ${textSecondary} mb-1`}>Estimated Gain</p>
                      <p className={`${theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'}`}>+56%</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary} mb-1`}>Risk Level</p>
                      <p className={`${theme === 'dark' ? 'text-[#FCD34D]' : 'text-[#FACC15]'}`}>Low</p>
                    </div>
                    <div>
                      <p className={`text-xs ${textSecondary} mb-1`}>Effort</p>
                      <p className={textPrimary}>2-3 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Execute Improvement
              </Button>
            </div>
          </Card>
        </div>

        {/* Logs */}
        <div className="col-span-3">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-inherit flex items-center gap-2">
              <Terminal className={`w-4 h-4 ${textPrimary}`} />
              <h3 className={textPrimary}>Logs</h3>
            </div>
            <div className={`p-4 font-mono text-xs ${terminalBg} ${terminalText} h-[500px] overflow-y-auto`}>
              {logs.map((log) => (
                <div key={log.id} className="mb-1">
                  <span className="text-[#6B7280]">[{log.time}]</span> {log.message}
                </div>
              ))}
              <div className="flex items-center gap-1 mt-2">
                <span className="animate-pulse">▋</span>
                <span className="text-[#6B7280]">Waiting for input...</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
