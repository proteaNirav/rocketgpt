#!/bin/bash
# RocketGPT Auth Fix Application Script
# Run this from your Next.js project root

set -e

echo "🚀 RocketGPT Auth Fix Application Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "app" ]; then
    echo "❌ Error: This script must be run from your Next.js project root"
    exit 1
fi

# Create backup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup in $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r app lib middleware.ts "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup created"

# Function to apply a fix
apply_fix() {
    local source_file=$1
    local dest_file=$2
    local description=$3
    
    echo ""
    echo "🔧 $description"
    
    if [ ! -f "$dest_file" ]; then
        echo "  ⚠️  File doesn't exist, will create: $dest_file"
    fi
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$dest_file")"
    
    # Copy the fixed file
    cat > "$dest_file" << 'EOF'
$source_file
EOF
    
    echo "  ✅ Applied: $dest_file"
}

# Apply lib/supabase/server.ts fix
echo ""
echo "🔧 Fixing lib/supabase/server.ts..."
cat > lib/supabase/server.ts << 'EOF'
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Creates a Supabase client for server-side use (App Router).
 * Properly handles cookies in both Server Components and Route Handlers/Actions.
 * 
 * @param options - Additional options for the client
 * @param options.serviceRole - Use service role key instead of anon key
 * @param options.cookieOptions - Override cookie options
 */
export function createSupabaseServerClient(options?: {
  serviceRole?: boolean;
  cookieOptions?: Partial<CookieOptions>;
}) {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    options?.serviceRole 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value, 
              ...options,
              // Ensure secure cookies in production
              secure: process.env.NODE_ENV === 'production',
            });
          } catch (error) {
            // This error is expected in Server Components (non-Route Handler/Action context)
            // The Supabase client will still work for read operations
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value: '', 
              ...options,
              maxAge: 0 
            });
          } catch (error) {
            // Expected in Server Components
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client specifically for Route Handlers.
 * This version ensures cookies can be written properly.
 */
export function createSupabaseRouteHandlerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            secure: process.env.NODE_ENV === 'production',
          });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            maxAge: 0 
          });
        },
      },
    }
  );
}

// Backward compatibility exports
export default createSupabaseServerClient;
export { createSupabaseServerClient as getSupabaseServerClient };
EOF
echo "  ✅ Applied: lib/supabase/server.ts"

# Remove duplicate files
echo ""
echo "🗑️  Removing duplicate Supabase client files..."
if [ -f "supabase/server.ts" ]; then
    rm -f supabase/server.ts
    echo "  ✅ Removed: supabase/server.ts"
fi
if [ -f "supabase/browser.ts" ]; then
    rm -f supabase/browser.ts
    echo "  ✅ Removed: supabase/browser.ts"
fi
if [ -f "supabase/guest.ts" ]; then
    rm -f supabase/guest.ts
    echo "  ✅ Removed: supabase/guest.ts"
fi

# Summary
echo ""
echo "========================================"
echo "✅ Auth fixes have been applied!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy the fixed files from /home/claude/fixed/ to your project:"
echo "   - app/auth/callback/route.ts"
echo "   - middleware.ts"
echo "   - app/login/page.tsx"
echo "   - app/api/guest/route.ts"
echo "   - app/account/page.tsx"
echo "   - app/api/auth/signout/route.ts (new file)"
echo ""
echo "2. Run the SQL migration in your Supabase dashboard"
echo "   (see supabase_migration.sql)"
echo ""
echo "3. Test locally:"
echo "   pnpm build"
echo "   pnpm dev"
echo ""
echo "4. Deploy to Vercel preview branch"
echo ""
echo "📁 Backup saved to: $BACKUP_DIR"
echo ""
echo "Good luck! 🚀"
EOF
