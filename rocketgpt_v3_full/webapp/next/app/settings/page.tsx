'use client'

import { ThemeToggle } from '@/components/theme-toggle'

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* UI Settings */}
      <section
        className="
          rounded-lg border 
          border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-900 
          p-4 space-y-4
        "
      >
        <div>
          <h2 className="text-sm font-semibold mb-2">UI & Theme</h2>
          <p className="text-xs text-gray-600 dark:text-slate-300 mb-3">
            Configure how RocketGPT looks. Choose between Light, Dark, or follow your system
            settings.
          </p>
        </div>

        {/* Dark Mode Toggle */}
        <ThemeToggle />

        <div className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Theme engine: active and fully integrated.
        </div>
      </section>

      {/* Behaviour Settings */}
      <section
        className="
          rounded-lg border 
          border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-900 
          p-4
        "
      >
        <h2 className="text-sm font-semibold mb-2">Behaviour (placeholder)</h2>
        <p className="text-xs text-gray-600 dark:text-slate-300">
          In a future iteration, this area will control how RocketGPT behaves: default model,
          response length, tone, and safety level.
        </p>
      </section>

      {/* Advanced Settings */}
      <section
        className="
          rounded-lg border 
          border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-900 
          p-4
        "
      >
        <h2 className="text-sm font-semibold mb-2">Advanced (placeholder)</h2>
        <p className="text-xs text-gray-600 dark:text-slate-300">
          Reserved for admin-level toggles like enabling experimental models, self-improve
          intensity, and integration flags.
        </p>
      </section>
    </div>
  )
}
