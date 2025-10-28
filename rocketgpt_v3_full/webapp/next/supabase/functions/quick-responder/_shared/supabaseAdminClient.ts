// supabase/functions/quick-responder/_shared/supabaseAdminClient.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const sbAdmin = createClient(url, key, {
  auth: { persistSession: false },
});
