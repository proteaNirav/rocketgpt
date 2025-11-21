import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Button } from '../button';
import { Badge } from '../badge';
import { Plus, Play, CheckCircle, Clock, Circle } from 'lucide-react';

export function RunbooksPage() {
  const { theme } = useTheme();
  const [selectedRunbook, setSelectedRunbook] = useState<number | null>(null);

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const runbooks = [
    { 
      id: 1, 
      title: 'API Deployment Pipeline', 
      steps: 8, 
      lastRun: '2 hours ago', 
      status: 'success',
      description: 'Deploy API to production environment'
    },
    { 
      id: 2, 
      title: 'Database Migration', 
      steps: 5, 
      lastRun: '1 day ago', 
      status: 'success',
      description: 'Run database schema migrations'
    },
    { 
      id: 3, 
      title: 'System Health Check', 
      steps: 12, 
      lastRun: '3 hours ago', 
      status: 'running',
      description: 'Comprehensive system health verification'
    },
    { 
      id: 4, 
      title: 'Backup & Restore', 
      steps: 6, 
      lastRun: '5 days ago', 
      status: 'pending',
      description: 'Create and verify system backups'
    },
  ];

  const steps = [
    { id: 1, title: 'Initialize Environment', status: 'completed', duration: '2s' },
    { id: 2, title: 'Run Tests', status: 'completed', duration: '45s' },
    { id: 3, title: 'Build Application', status: 'completed', duration: '1m 20s' },
    { id: 4, title: 'Deploy to Staging', status: 'running', duration: '30s...' },
    { id: 5, title: 'Run Integration Tests', status: 'pending', duration: '-' },
    { id: 6, title: 'Deploy to Production', status: 'pending', duration: '-' },
    { id: 7, title: 'Verify Deployment', status: 'pending', duration: '-' },
    { id: 8, title: 'Send Notifications', status: 'pending', duration: '-' },
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'completed') {
      return <CheckCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-[#4ADE80]' : 'text-[#22C55E]'}`} />;
    }
    if (status === 'running') {
      return <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-[#3B82F6]' : 'text-[#2563EB]'} animate-spin`} />;
    }
    return <Circle className={`w-5 h-5 ${textSecondary}`} />;
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className={textSecondary}>Manage and execute automated workflows</p>
        </div>
        <Button>
          <Plus className="w-5 h-5 mr-2" />
          Create Runbook
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {runbooks.map((runbook) => (
          <Card 
            key={runbook.id}
            className={`cursor-pointer transition-all ${
              selectedRunbook === runbook.id 
                ? theme === 'dark' ? 'ring-2 ring-[#3B82F6]' : 'ring-2 ring-[#2563EB]'
                : ''
            }`}
            onClick={() => setSelectedRunbook(runbook.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`mb-1 ${textPrimary}`}>{runbook.title}</h3>
                <p className={`text-sm ${textSecondary}`}>{runbook.description}</p>
              </div>
              <Badge variant={
                runbook.status === 'success' ? 'success' :
                runbook.status === 'running' ? 'running' : 'pending'
              }>
                {runbook.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <span className={`text-sm ${textSecondary}`}>{runbook.steps} steps</span>
              <span className={textSecondary}>•</span>
              <span className={`text-sm ${textSecondary}`}>Last run: {runbook.lastRun}</span>
            </div>

            <div className="mt-4 pt-4 border-t border-inherit">
              <Button size="sm" className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Run Runbook
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedRunbook && (
        <Card>
          <h3 className={`mb-6 ${textPrimary}`}>Runbook Steps - API Deployment Pipeline</h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className={`absolute left-[10px] top-4 bottom-4 w-0.5 ${theme === 'dark' ? 'bg-[#2D323C]' : 'bg-[#E5E7EB]'}`} />
            
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="relative pl-10">
                  <div className="absolute left-0 top-0">
                    {getStatusIcon(step.status)}
                  </div>
                  
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm ${textSecondary}`}>Step {step.id}</span>
                          <h4 className={textPrimary}>{step.title}</h4>
                        </div>
                        <p className={`text-sm ${textSecondary}`}>Duration: {step.duration}</p>
                      </div>
                      
                      {step.status === 'pending' && (
                        <Button size="sm" variant="ghost">
                          <Play className="w-4 h-4 mr-2" />
                          Run Step
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-inherit flex gap-3">
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Execute All Steps
            </Button>
            <Button variant="secondary">View Logs</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
