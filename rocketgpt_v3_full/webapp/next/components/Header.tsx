import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const HeaderThemeToggle = () => {
  return <ThemeToggle />;
};

//import { HeaderThemeToggle } from '@/components/header-theme-toggle';
import ThemeToggle from "./ThemeToggle";


export default async function Header() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOutAction() {
    'use server';
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  return (
    <header className="w-full border-b border-gray-300 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand + Primary Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            RocketGPT
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              AI Orchestrator
            </span>
          </Link>

          {/* Primary navigation */}
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
            >
              Overview
            </Link>
            <Link
              href="/settings"
              className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
            >
              Settings
            </Link>
            <Link
              href="/planner"
              className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
            >
              Planner
            </Link>
            <Link
              href="/usage"
              className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
            >
              Usage
            </Link>
            <Link
              href="/logs"
              className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
            >
              Logs
            </Link>
          </nav>
        </div>

        {/* Right side: Theme toggle + Auth */}
        <div className="flex items-center gap-2">
          {/* Compact header theme toggle (always visible) */}
          <HeaderThemeToggle />

          {/* Extra shortcuts on small screens */}
          <Link
            href="/settings"
            className="md:hidden rounded border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Settings
          </Link>
          <Link
            href="/usage"
            className="md:hidden rounded border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Usage
          </Link>
          <Link
            href="/logs"
            className="md:hidden rounded border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Logs
          </Link>

          {!user ? (
            <Link
              href="/login"
              className="rounded border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800"
            >
              Login / Sign up
            </Link>
          ) : (
            <>
              <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-200">
                Welcome, <b>{user.user_metadata?.full_name ?? user.email}</b>
              </span>

              <Link
                href="/account"
                className="hidden sm:inline rounded border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Account
              </Link>

              <Link
                href="/account/profile"
                className="hidden sm:inline rounded border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Profile
              </Link>

              <form action={signOutAction}>
                <button
                  className="rounded bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-sm hover:opacity-90"
                >
                  Logout
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

