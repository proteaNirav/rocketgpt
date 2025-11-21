import React from 'react';
import { useTheme } from './theme-provider';
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  BookOpen, 
  Zap, 
  CreditCard, 
  Cpu, 
  ScrollText, 
  Shield, 
  Settings, 
  Info,
  Rocket
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sessions', label: 'Sessions', icon: MessageSquare },
  { id: 'prompts', label: 'Prompts Library', icon: FileText },
  { id: 'runbooks', label: 'Runbooks', icon: BookOpen },
  { id: 'self-improve', label: 'Self-Improve Console', icon: Zap },
  { id: 'plans', label: 'Plans & Limits', icon: CreditCard },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'about', label: 'About', icon: Info },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { theme } = useTheme();

  const bgColor = theme === 'dark' ? 'bg-[#1A1D24]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-[#2D323C]' : 'border-[#E5E7EB]';
  const textColor = theme === 'dark' ? 'text-[#D1D5DB]' : 'text-[#4B5563]';
  const activeColor = theme === 'dark' ? 'bg-[#3B82F6] text-white' : 'bg-[#2563EB] text-white';
  const hoverColor = theme === 'dark' ? 'hover:bg-[#2D323C]' : 'hover:bg-[#F5F5F5]';

  return (
    <div className={`w-64 h-screen ${bgColor} border-r ${borderColor} flex flex-col`}>
      {/* Logo */}
      <div className="p-6 border-b border-inherit">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`}>
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]'}>RocketGPT</h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>AI Console</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? activeColor 
                      : `${textColor} ${hoverColor}`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
