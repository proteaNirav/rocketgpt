export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();

  // Guard: tolerate SSR environments without crashing
  const { data, error } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }));
  const user = data?.user ?? null;

  // If not logged in, send to login (adjust if you prefer a 200 with a message)
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Account</h1>
      <p className="opacity-80">Signed in as <b>{user.email}</b></p>
    </main>
  );
}
