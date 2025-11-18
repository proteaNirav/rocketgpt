# RocketGPT Auth Fix - Application Guide

## Quick Apply Instructions

### Step 1: Backup Current Files
```bash
# Create backup
cp -r app lib middleware.ts ~/backup_$(date +%Y%m%d_%H%M%S)/
```

### Step 2: Apply File Replacements

Replace these files completely with the versions in `/home/claude/fixed/`:
1. `lib/supabase/server.ts`
2. `app/auth/callback/route.ts`
3. `middleware.ts`
4. `app/login/page.tsx`
5. `app/api/guest/route.ts`
6. `app/account/page.tsx`

New file to create:
7. `app/api/auth/signout/route.ts`

### Step 3: Remove Duplicate Files
```bash
# Remove conflicting duplicates
rm -f supabase/server.ts
rm -f supabase/browser.ts
rm -f supabase/guest.ts
```

### Step 4: Apply Database Migrations

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the entire contents of `supabase_migration.sql`
4. Verify tables and policies were created

### Step 5: Environment Variables

Ensure these are set in Vercel:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

## Verification Checklist

### Local Testing
```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Start dev server
pnpm dev

# 4. Test flows:
- [ ] Visit /login - should load without errors
- [ ] Click "Send OTP Code" - should send email
- [ ] Use magic link from email - should redirect to /account
- [ ] Visit /account while logged in - should show user info
- [ ] Visit /account while logged out - should redirect to /login
- [ ] Sign out - should redirect to home
- [ ] OAuth login (Google/GitHub) - should work
```

### Vercel Deployment Testing

1. **Deploy to preview branch first**
```bash
git checkout -b auth-fix
git add .
git commit -m "Fix auth redirect loop and RLS issues"
git push origin auth-fix
```

2. **Test on preview URL**
- [ ] Magic link flow works
- [ ] No infinite redirects
- [ ] No cookie errors in console
- [ ] Guest session creates without RLS errors
- [ ] OAuth providers work

3. **Check Vercel Function Logs**
- Look for `[auth/callback]` logs
- Verify session exchange succeeds
- Check for guest migration logs

## Fixed Issues Summary

### ✅ Issue 1: Infinite Redirect Loop
- **Root cause**: Middleware checked wrong cookie name, callback couldn't write cookies
- **Fix**: Proper Supabase session check in middleware, dedicated Route Handler client

### ✅ Issue 2: Cookie Modification Error
- **Root cause**: Client components trying to modify cookies directly
- **Fix**: Use Route Handlers for all cookie operations

### ✅ Issue 3: RLS Error 42501
- **Root cause**: Missing RLS policies for anonymous guest creation
- **Fix**: Added proper RLS policies allowing anon inserts

### ✅ Issue 4: Server/Client Mismatch
- **Root cause**: Duplicate client files with different implementations
- **Fix**: Consolidated to single lib/supabase/ folder

### ✅ Issue 5: SSR Auth Issues
- **Root cause**: Server client couldn't properly handle cookies
- **Fix**: Separate handlers for Server Components vs Route Handlers

## Future Improvements (Stage Later)

1. **Enhanced Error Handling**
   - Add Sentry error boundaries around auth components
   - Better error messages for users
   - Retry logic for transient failures

2. **Rate Limiting**
   - Add rate limiting to /api/guest endpoint
   - Implement progressive delays for OTP requests
   - Add CAPTCHA for repeated failed attempts

3. **Telemetry & Monitoring**
   - Track auth funnel metrics (drop-off rates)
   - Monitor magic link click rates
   - Alert on auth callback failures

4. **Security Enhancements**
   - Implement PKCE for OAuth flows
   - Add device fingerprinting
   - Session activity monitoring

5. **Performance Optimization**
   - Cache guest session checks
   - Optimize middleware execution
   - Add prefetching for auth routes

6. **User Experience**
   - Add "Remember me" functionality
   - Implement passwordless WebAuthn
   - Better loading states during auth

## Troubleshooting

### If redirect loop persists:
1. Clear all cookies for your domain
2. Check Supabase dashboard for correct redirect URLs
3. Verify NEXT_PUBLIC_SITE_URL is set correctly
4. Check browser console for specific error messages

### If RLS errors continue:
1. Verify migrations ran successfully
2. Check Supabase logs for specific policy violations
3. Ensure service role key is set (for admin operations)
4. Test policies in Supabase SQL editor

### If cookies still error:
1. Ensure you're using the fixed server.ts
2. Verify route handlers use createSupabaseRouteHandlerClient()
3. Check that middleware uses proper cookie handling
4. Confirm production uses secure cookies

## Support

For any issues after applying these fixes:
1. Check Vercel function logs
2. Review Supabase auth logs
3. Test in incognito/private browsing
4. Verify all environment variables are set
