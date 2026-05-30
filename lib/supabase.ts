/**
 * Supabase client singletons.
 *
 * Two clients are exported:
 *
 * `supabase`      — Anon key, safe for client-side use. Subject to RLS policies.
 * `supabaseAdmin` — Service-role key, for server-only code (API routes, Inngest
 *                   functions). Bypasses RLS. NEVER import this in client components.
 *
 * Both clients are lazily instantiated at module load time; re-using singletons
 * avoids spinning up a new connection pool on every request in serverless contexts.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Public anon client — use in client components or public API reads. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Admin client with service-role privileges.
 * `autoRefreshToken` and `persistSession` are disabled because this client
 * runs exclusively in server environments where there is no persistent session.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
