import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Input } from '../input';
import { Button } from '../button';
import { Rocket } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const bgColor = theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]';
  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';
  const cardBg = theme === 'dark' ? 'bg-[#1A1D24]' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-[#2D323C]' : 'border-[#E5E7EB]';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className={`min-h-screen ${bgColor} flex items-center justify-center p-4`}>
      <div className={`w-full max-w-md ${cardBg} rounded-xl border ${borderColor} p-8`}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`}>
            <Rocket className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className={`mb-2 ${textPrimary}`}>Welcome to RocketGPT Console</h2>
          <p className={`text-sm ${textSecondary}`}>
            Sign in to access your AI development tools
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <button className={`text-sm ${theme === 'dark' ? 'text-[#3B82F6] hover:text-[#60A5FA]' : 'text-[#2563EB] hover:text-[#1D4ED8]'} transition-colors`}>
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}
