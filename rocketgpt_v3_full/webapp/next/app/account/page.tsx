import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }} = await supabase.auth.getUser();

  console.log("ACCOUNT USER:", user);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-2">Welcome {user?.email}</p>
    </div>
  );
}
