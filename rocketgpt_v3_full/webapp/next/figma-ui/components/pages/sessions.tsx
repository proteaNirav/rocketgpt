import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Input } from '../input';
import { Button } from '../button';
import { Search, Plus, Send, RotateCcw, Pin, Download } from 'lucide-react';

export function SessionsPage() {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [selectedSession, setSelectedSession] = useState(1);

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';
  const bgColor = theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]';

  const sessions = [
    { id: 1, title: 'Code Review Assistant', lastMessage: 'How can I improve this function?', time: '5 mins ago' },
    { id: 2, title: 'Bug Analysis', lastMessage: 'Analyzing stack trace...', time: '15 mins ago' },
    { id: 3, title: 'Documentation Writer', lastMessage: 'Generate API docs', time: '1 hour ago' },
    { id: 4, title: 'Data Processing', lastMessage: 'Process CSV file', time: '2 hours ago' },
  ];

  const messages = [
    { id: 1, type: 'user', content: 'Can you help me review this React component?', time: '10:30 AM' },
    { id: 2, type: 'ai', content: 'Of course! I\'d be happy to help review your React component. Please share the code, and I\'ll provide detailed feedback on structure, performance, and best practices.', time: '10:30 AM' },
    { id: 3, type: 'user', content: 'Here\'s the component:\n\n```jsx\nfunction UserCard({ user }) {\n  return <div>{user.name}</div>\n}\n```', time: '10:31 AM', hasCode: true },
    { id: 4, type: 'ai', content: 'Great! Here are my recommendations:\n\n1. Add PropTypes or TypeScript for type safety\n2. Consider destructuring props\n3. Add fallback for missing data\n\nHere\'s an improved version:\n\n```jsx\nfunction UserCard({ user }) {\n  const { name = \'Unknown User\' } = user || {};\n  return <div className="user-card">{name}</div>;\n}\n```', time: '10:32 AM', hasCode: true },
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sessions List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input placeholder="Search sessions..." className="w-full" />
          </div>
          <Button>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <Card className="flex-1 overflow-y-auto p-0">
          <div className="divide-y divide-inherit">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedSession === session.id
                    ? theme === 'dark' ? 'bg-[#2D323C]' : 'bg-[#F5F5F5]'
                    : theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'
                }`}
              >
                <h4 className={`mb-1 ${textPrimary}`}>{session.title}</h4>
                <p className={`text-sm ${textSecondary} truncate`}>{session.lastMessage}</p>
                <p className={`text-xs ${textSecondary} mt-1`}>{session.time}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={textPrimary}>Code Review Assistant</h3>
              <p className={`text-sm ${textSecondary}`}>Model: GPT-5 • Online</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Pin className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Messages */}
        <Card className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-lg p-4 ${
                      msg.type === 'user'
                        ? theme === 'dark'
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-[#2563EB] text-white'
                        : theme === 'dark'
                        ? 'bg-[#2D323C] text-[#F9FAFB]'
                        : 'bg-[#F5F5F5] text-[#111827]'
                    }`}
                  >
                    {msg.hasCode ? (
                      <pre className="whitespace-pre-wrap font-mono text-sm">{msg.content}</pre>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  <p className={`text-xs ${textSecondary} mt-1 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Input */}
        <Card>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                theme === 'dark'
                  ? 'bg-[#0D0F14] border-[#2D323C] text-[#F9FAFB] placeholder:text-[#6B7280] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                  : 'bg-white border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-[#2563EB]'
              }`}
            />
            <Button>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
