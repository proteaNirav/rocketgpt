import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Input } from '../input';
import { Button } from '../button';
import { Badge } from '../badge';
import { Search, Plus, Edit, Copy, Trash2, Tag } from 'lucide-react';

export function PromptsPage() {
  const { theme } = useTheme();
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';
  const borderColor = theme === 'dark' ? 'border-[#2D323C]' : 'border-[#E5E7EB]';

  const prompts = [
    { 
      id: 1, 
      name: 'Code Review Template', 
      type: 'System', 
      category: 'Development', 
      lastUsed: '2 hours ago',
      tags: ['code', 'review'],
      body: 'You are an expert code reviewer. Analyze the following code and provide detailed feedback...'
    },
    { 
      id: 2, 
      name: 'Bug Analysis', 
      type: 'User', 
      category: 'Debugging', 
      lastUsed: '5 hours ago',
      tags: ['bug', 'analysis'],
      body: 'Analyze this error and provide solutions...'
    },
    { 
      id: 3, 
      name: 'Documentation Generator', 
      type: 'System', 
      category: 'Documentation', 
      lastUsed: '1 day ago',
      tags: ['docs', 'api'],
      body: 'Generate comprehensive documentation for the following API...'
    },
    { 
      id: 4, 
      name: 'SQL Query Optimizer', 
      type: 'User', 
      category: 'Database', 
      lastUsed: '3 days ago',
      tags: ['sql', 'optimization'],
      body: 'Optimize the following SQL query for better performance...'
    },
  ];

  const handleEdit = (prompt: any) => {
    setSelectedPrompt(prompt);
    setShowDrawer(true);
  };

  return (
    <div className="relative">
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input placeholder="Search prompts..." />
        </div>
        <Button onClick={() => handleEdit(null)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Prompt
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <tr>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Name</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Type</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Category</th>
                <th className={`px-6 py-3 text-left ${textPrimary}`}>Last Used</th>
                <th className={`px-6 py-3 text-right ${textPrimary}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderColor}`}>
              {prompts.map((prompt) => (
                <tr 
                  key={prompt.id}
                  className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}
                >
                  <td className={`px-6 py-4 ${textPrimary}`}>
                    <div>
                      <p>{prompt.name}</p>
                      <div className="flex gap-1 mt-1">
                        {prompt.tags.map((tag) => (
                          <Badge key={tag} variant="default">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${textSecondary}`}>
                    <Badge variant={prompt.type === 'System' ? 'running' : 'default'}>
                      {prompt.type}
                    </Badge>
                  </td>
                  <td className={`px-6 py-4 ${textSecondary}`}>{prompt.category}</td>
                  <td className={`px-6 py-4 ${textSecondary}`}>{prompt.lastUsed}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(prompt)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-[#EF4444]" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Right Drawer */}
      {showDrawer && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end"
          onClick={() => setShowDrawer(false)}
        >
          <div 
            className={`w-[500px] h-full ${theme === 'dark' ? 'bg-[#1A1D24]' : 'bg-white'} shadow-2xl overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className={textPrimary}>
                  {selectedPrompt ? 'Edit Prompt' : 'Create Prompt'}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowDrawer(false)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <Input 
                  label="Title" 
                  placeholder="Enter prompt title"
                  defaultValue={selectedPrompt?.name}
                />
                
                <Input 
                  label="Description" 
                  placeholder="Brief description"
                />

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                    Prompt Body
                  </label>
                  <textarea
                    className={`w-full px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 min-h-[200px] font-mono text-sm ${
                      theme === 'dark'
                        ? 'bg-[#0D0F14] border-[#2D323C] text-[#F9FAFB] placeholder:text-[#6B7280] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                        : 'bg-white border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-[#2563EB]'
                    }`}
                    placeholder="Enter your prompt..."
                    defaultValue={selectedPrompt?.body}
                  />
                </div>

                <Input 
                  label="Tags" 
                  placeholder="Add tags (comma-separated)"
                  defaultValue={selectedPrompt?.tags?.join(', ') || ''}
                />

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1">Save Prompt</Button>
                  <Button variant="secondary" onClick={() => setShowDrawer(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}