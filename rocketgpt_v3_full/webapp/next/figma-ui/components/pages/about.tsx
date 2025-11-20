import React from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Badge } from '../badge';
import { Rocket, Github, Globe, Mail, Heart } from 'lucide-react';
import { Button } from '../button';

export function AboutPage() {
  const { theme } = useTheme();

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const features = [
    'AI-powered development console',
    'Multi-model support (GPT, Claude, Gemini)',
    'Session management & history',
    'Prompt library & templates',
    'Automated runbooks',
    'Self-improvement system',
    'Real-time monitoring',
    'Advanced admin controls'
  ];

  const techStack = [
    { name: 'React', version: '18.x' },
    { name: 'TypeScript', version: '5.x' },
    { name: 'Tailwind CSS', version: '4.x' },
    { name: 'Recharts', version: '2.x' },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Hero */}
      <Card>
        <div className="text-center">
          <div className={`inline-flex w-20 h-20 rounded-2xl items-center justify-center mb-4 ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`}>
            <Rocket className="w-12 h-12 text-white" />
          </div>
          <h2 className={`mb-2 ${textPrimary}`}>RocketGPT</h2>
          <p className={`mb-4 ${textSecondary}`}>AI Development Console</p>
          <Badge variant="running">Version 1.0.0</Badge>
        </div>
      </Card>

      {/* Description */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>About RocketGPT</h3>
        <p className={`mb-4 ${textSecondary}`}>
          RocketGPT is a professional AI development console designed for developers and teams who want to harness
          the power of multiple AI models in a unified, organized workspace. Built with precision and efficiency in mind,
          it provides enterprise-grade tools for managing AI workflows, prompts, and automated processes.
        </p>
        <p className={textSecondary}>
          Whether you're building prototypes, automating tasks, or conducting complex analyses, RocketGPT provides
          the infrastructure and interface you need to work effectively with AI.
        </p>
      </Card>

      {/* Features */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>Key Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <div key={feature} className={`flex items-center gap-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-[#3B82F6]' : 'bg-[#2563EB]'}`} />
              <span className={textPrimary}>{feature}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tech Stack */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>Technology Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {techStack.map((tech) => (
            <div key={tech.name} className={`p-4 rounded-lg text-center ${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
              <h4 className={`mb-1 ${textPrimary}`}>{tech.name}</h4>
              <p className={`text-sm ${textSecondary}`}>{tech.version}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* System Info */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>System Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className={textSecondary}>Build Date</span>
            <span className={textPrimary}>November 19, 2025</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={textSecondary}>Environment</span>
            <Badge variant="success">Production</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className={textSecondary}>License</span>
            <span className={textPrimary}>Commercial</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={textSecondary}>Support Status</span>
            <Badge variant="success">Active</Badge>
          </div>
        </div>
      </Card>

      {/* Contact & Links */}
      <Card>
        <h3 className={`mb-4 ${textPrimary}`}>Contact & Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="secondary" className="justify-start">
            <Globe className="w-4 h-4 mr-2" />
            Documentation
          </Button>
          <Button variant="secondary" className="justify-start">
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </Button>
          <Button variant="secondary" className="justify-start">
            <Mail className="w-4 h-4 mr-2" />
            Support
          </Button>
          <Button variant="secondary" className="justify-start">
            <Heart className="w-4 h-4 mr-2" />
            Community
          </Button>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center py-6">
        <p className={textSecondary}>
          Made with ❤️ by the RocketGPT Team
        </p>
        <p className={`text-sm ${textSecondary} mt-2`}>
          © 2025 RocketGPT. All rights reserved.
        </p>
      </div>
    </div>
  );
}
