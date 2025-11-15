export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result?.data?.user ?? null;
  } catch {
    user = null;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Account</h1>
      {user ? (
        <div className="space-y-1">
          <div><span className="font-medium">User ID:</span> {user.id}</div>
          <div><span className="font-medium">Email:</span> {user.email ?? "—"}</div>
        </div>
      ) : (
        <p>You're not signed in.</p>
      )}
    </main>
  );
}
