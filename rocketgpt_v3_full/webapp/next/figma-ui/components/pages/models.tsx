import React from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Badge } from '../badge';
import { Button } from '../button';
import { Settings, Zap, BarChart } from 'lucide-react';

export function ModelsPage() {
  const { theme } = useTheme();

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const models = [
    {
      id: 1,
      name: 'GPT-5',
      provider: 'OpenAI',
      status: 'active',
      description: 'Most capable model for complex reasoning and code generation',
      specs: {
        contextWindow: '128K tokens',
        speed: 'Fast',
        cost: '$0.03/1K'
      },
      usage: { requests: 12450, tokens: 3200000 }
    },
    {
      id: 2,
      name: 'Claude 3 Opus',
      provider: 'Anthropic',
      status: 'active',
      description: 'Excellent for long-form content and detailed analysis',
      specs: {
        contextWindow: '200K tokens',
        speed: 'Medium',
        cost: '$0.025/1K'
      },
      usage: { requests: 8230, tokens: 2100000 }
    },
    {
      id: 3,
      name: 'Gemini Pro',
      provider: 'Google',
      status: 'active',
      description: 'Balanced performance for general tasks',
      specs: {
        contextWindow: '32K tokens',
        speed: 'Very Fast',
        cost: '$0.02/1K'
      },
      usage: { requests: 5670, tokens: 890000 }
    },
    {
      id: 4,
      name: 'GPT-4 Turbo',
      provider: 'OpenAI',
      status: 'inactive',
      description: 'Previous generation model',
      specs: {
        contextWindow: '128K tokens',
        speed: 'Fast',
        cost: '$0.01/1K'
      },
      usage: { requests: 450, tokens: 120000 }
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className={textSecondary}>Manage AI models and configure preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {models.map((model) => (
          <Card key={model.id}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={textPrimary}>{model.name}</h3>
                  <Badge variant={model.status === 'active' ? 'success' : 'default'}>
                    {model.status}
                  </Badge>
                </div>
                <p className={`text-sm ${textSecondary} mb-1`}>{model.provider}</p>
                <p className={`text-sm ${textSecondary}`}>{model.description}</p>
              </div>
            </div>

            <div className={`grid grid-cols-3 gap-4 p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <div>
                <p className={`text-xs ${textSecondary} mb-1`}>Context Window</p>
                <p className={`text-sm ${textPrimary}`}>{model.specs.contextWindow}</p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary} mb-1`}>Speed</p>
                <p className={`text-sm ${textPrimary}`}>{model.specs.speed}</p>
              </div>
              <div>
                <p className={`text-xs ${textSecondary} mb-1`}>Cost</p>
                <p className={`text-sm ${textPrimary}`}>{model.specs.cost}</p>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-4 h-4 ${textSecondary}`} />
                  <p className={`text-xs ${textSecondary}`}>Total Requests</p>
                </div>
                <p className={textPrimary}>{model.usage.requests.toLocaleString()}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart className={`w-4 h-4 ${textSecondary}`} />
                  <p className={`text-xs ${textSecondary}`}>Tokens Used</p>
                </div>
                <p className={textPrimary}>{model.usage.tokens.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
              {model.status === 'active' ? (
                <Button variant="ghost" size="sm">
                  Deactivate
                </Button>
              ) : (
                <Button size="sm">
                  Activate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Model Comparison */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>Model Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <tr>
                <th className={`px-4 py-3 text-left ${textPrimary}`}>Model</th>
                <th className={`px-4 py-3 text-left ${textPrimary}`}>Context</th>
                <th className={`px-4 py-3 text-left ${textPrimary}`}>Speed</th>
                <th className={`px-4 py-3 text-left ${textPrimary}`}>Cost</th>
                <th className={`px-4 py-3 text-left ${textPrimary}`}>Best For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              <tr className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                <td className={`px-4 py-3 ${textPrimary}`}>GPT-5</td>
                <td className={`px-4 py-3 ${textSecondary}`}>128K</td>
                <td className={`px-4 py-3`}>
                  <Badge variant="success">Fast</Badge>
                </td>
                <td className={`px-4 py-3 ${textSecondary}`}>$0.03/1K</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Complex reasoning, code</td>
              </tr>
              <tr className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                <td className={`px-4 py-3 ${textPrimary}`}>Claude 3</td>
                <td className={`px-4 py-3 ${textSecondary}`}>200K</td>
                <td className={`px-4 py-3`}>
                  <Badge variant="warning">Medium</Badge>
                </td>
                <td className={`px-4 py-3 ${textSecondary}`}>$0.025/1K</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Long-form content, analysis</td>
              </tr>
              <tr className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                <td className={`px-4 py-3 ${textPrimary}`}>Gemini Pro</td>
                <td className={`px-4 py-3 ${textSecondary}`}>32K</td>
                <td className={`px-4 py-3`}>
                  <Badge variant="success">Very Fast</Badge>
                </td>
                <td className={`px-4 py-3 ${textSecondary}`}>$0.02/1K</td>
                <td className={`px-4 py-3 ${textSecondary}`}>General tasks, quick responses</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
