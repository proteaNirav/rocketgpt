import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  // Create server client for reading session
  const supabase = createSupabaseServerClient();
  
  // Get the current user
  const { data: { user }, error } = await supabase.auth.getUser();

  // This shouldn't happen due to middleware, but double-check
  if (!user || error) {
    console.error("[account] No user found, redirecting to login");
    redirect('/login');
  }

  // Fetch additional user data if needed
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get user's usage stats
  const { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>
          
          {profile?.full_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{profile.full_name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">User ID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono">{user.id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Created</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          {user.last_sign_in_at && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Sign In</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(user.last_sign_in_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {usage && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Usage</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">API Calls This Month</label>
              <p className="mt-1 text-sm text-gray-900">{usage.api_calls_month || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total API Calls</label>
              <p className="mt-1 text-sm text-gray-900">{usage.api_calls_total || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="space-y-3">
          <Link 
            href="/api/auth/signout"
            className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </Link>
        </div>
      </div>
    </div>
  );
}
