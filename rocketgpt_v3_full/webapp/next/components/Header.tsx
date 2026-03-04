import Link from "next/link";

function hasSupabaseEnv(): boolean {
  // Keep it server-safe; this component is used in RootLayout.
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function SupabaseHeader() {
  // Lazy import to avoid evaluating supabase server client when env is missing
  const mod = await import("./HeaderSupabase");
  const C = mod.default;
  return <C />;
}

function DemoSafeHeader() {
  return (
    <header className="w-full border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold">
            RocketGPT
          </Link>
          <nav className="hidden items-center gap-3 text-sm text-neutral-700 md:flex">
            <Link href="/cats/library" className="hover:underline">CATS Library</Link>
            <Link href="/cats/generate" className="hover:underline">Create CAT</Link>
            <Link href="/workflows/builder" className="hover:underline">Workflow Builder</Link>
          </nav>
        </div>

        <div className="text-xs text-neutral-500">
          Demo mode (Supabase not configured)
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <nav className="flex flex-wrap gap-3 text-sm text-neutral-700">
          <Link href="/cats/library" className="hover:underline">CATS Library</Link>
          <Link href="/cats/generate" className="hover:underline">Create CAT</Link>
          <Link href="/workflows/builder" className="hover:underline">Workflow Builder</Link>
        </nav>
      </div>
    </header>
  );
}

export default async function Header() {
  if (!hasSupabaseEnv()) return <DemoSafeHeader />;
  return await SupabaseHeader();
}
