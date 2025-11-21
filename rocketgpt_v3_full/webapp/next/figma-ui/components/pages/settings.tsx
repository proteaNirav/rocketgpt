import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Input } from '../input';
import { Button } from '../button';
import { User, Bell, Key, Palette, Mic } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme);

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <User className={`w-5 h-5 ${textPrimary}`} />
          <h3 className={textPrimary}>Profile</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`}>
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <Button size="sm">Change Avatar</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" defaultValue="John" />
            <Input label="Last Name" defaultValue="Doe" />
          </div>

          <Input label="Email" type="email" defaultValue="john@example.com" />
          
          <Input label="Organization" defaultValue="Acme Corp" />

          <Button>Save Changes</Button>
        </div>
      </Card>

      {/* Theme */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Palette className={`w-5 h-5 ${textPrimary}`} />
          <h3 className={textPrimary}>Theme Preferences</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedTheme === 'light'
                  ? 'border-[#2563EB] bg-[#2563EB]/5'
                  : theme === 'dark'
                  ? 'border-[#2D323C] hover:border-[#3B82F6]'
                  : 'border-[#E5E7EB] hover:border-[#2563EB]'
              }`}
            >
              <div className="w-full h-32 rounded bg-white border border-[#E5E7EB] mb-3 flex items-center justify-center">
                <div className="text-[#111827]">Aa</div>
              </div>
              <p className={textPrimary}>Light</p>
            </button>

            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-6 rounded-lg border-2 transition-all ${
                selectedTheme === 'dark'
                  ? 'border-[#3B82F6] bg-[#3B82F6]/5'
                  : theme === 'dark'
                  ? 'border-[#2D323C] hover:border-[#3B82F6]'
                  : 'border-[#E5E7EB] hover:border-[#2563EB]'
              }`}
            >
              <div className="w-full h-32 rounded bg-[#0D0F14] border border-[#2D323C] mb-3 flex items-center justify-center">
                <div className="text-[#F9FAFB]">Aa</div>
              </div>
              <p className={textPrimary}>Dark</p>
            </button>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Bell className={`w-5 h-5 ${textPrimary}`} />
          <h3 className={textPrimary}>Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={textPrimary}>Email Notifications</p>
              <p className={`text-sm ${textSecondary}`}>Receive email updates about your activity</p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className={`w-12 h-6 rounded-full peer transition-all ${
                theme === 'dark' 
                  ? 'bg-[#2D323C] peer-checked:bg-[#3B82F6]' 
                  : 'bg-[#E5E7EB] peer-checked:bg-[#2563EB]'
              }`}></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-6"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={textPrimary}>Push Notifications</p>
              <p className={`text-sm ${textSecondary}`}>Receive push notifications in browser</p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input type="checkbox" className="sr-only peer" />
              <div className={`w-12 h-6 rounded-full peer transition-all ${
                theme === 'dark' 
                  ? 'bg-[#2D323C] peer-checked:bg-[#3B82F6]' 
                  : 'bg-[#E5E7EB] peer-checked:bg-[#2563EB]'
              }`}></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-6"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={textPrimary}>Session Updates</p>
              <p className={`text-sm ${textSecondary}`}>Get notified when sessions complete</p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className={`w-12 h-6 rounded-full peer transition-all ${
                theme === 'dark' 
                  ? 'bg-[#2D323C] peer-checked:bg-[#3B82F6]' 
                  : 'bg-[#E5E7EB] peer-checked:bg-[#2563EB]'
              }`}></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-6"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* API & Integrations */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Key className={`w-5 h-5 ${textPrimary}`} />
          <h3 className={textPrimary}>Integrations</h3>
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#0D0F14] border-[#2D323C]' : 'bg-[#F5F5F5] border-[#E5E7EB]'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className={textPrimary}>GitHub</h4>
                <p className={`text-sm ${textSecondary}`}>Connect your GitHub account</p>
              </div>
              <Button size="sm">Connect</Button>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#0D0F14] border-[#2D323C]' : 'bg-[#F5F5F5] border-[#E5E7EB]'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className={textPrimary}>Slack</h4>
                <p className={`text-sm ${textSecondary}`}>Send notifications to Slack</p>
              </div>
              <Button size="sm">Connect</Button>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#0D0F14] border-[#2D323C]' : 'bg-[#F5F5F5] border-[#E5E7EB]'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className={textPrimary}>Webhook</h4>
                <p className={`text-sm ${textSecondary}`}>Configure custom webhooks</p>
              </div>
              <Button size="sm">Setup</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Voice & Mic */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Mic className={`w-5 h-5 ${textPrimary}`} />
          <h3 className={textPrimary}>Voice & Microphone</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm mb-2 ${textPrimary}`}>Microphone Device</label>
            <select className={`w-full px-3 py-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              theme === 'dark'
                ? 'bg-[#1A1D24] border-[#2D323C] text-[#F9FAFB] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
                : 'bg-white border-[#E5E7EB] text-[#111827] focus:border-[#2563EB] focus:ring-[#2563EB]'
            }`}>
              <option>Default Microphone</option>
              <option>External Microphone</option>
              <option>Headset Microphone</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={textPrimary}>Voice Input</p>
              <p className={`text-sm ${textSecondary}`}>Enable voice commands</p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className={`w-12 h-6 rounded-full peer transition-all ${
                theme === 'dark' 
                  ? 'bg-[#2D323C] peer-checked:bg-[#3B82F6]' 
                  : 'bg-[#E5E7EB] peer-checked:bg-[#2563EB]'
              }`}></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-6"></div>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}