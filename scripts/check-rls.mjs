// scripts/check-rls.mjs
// Pre-build guard: fail if any public Supabase table has RLS disabled.
// Added 2026-04-22 after Supabase flagged rls_disabled_in_public on 6 tables
// (incl. ftp_transfers which stored Blackbox passwords in plaintext).
//
// Runs automatically before `next build` via the `prebuild` npm lifecycle hook.
// Vercel deploys run `npm run build`, which auto-runs `prebuild` first.
//
// Relies on the SQL function public.check_rls_disabled_tables() created in
// the same hardening pass. Only the service_role can call it.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  // Missing envs → likely local dev without secrets. Skip silently.
  console.log('[check-rls] Skipped: SUPABASE env vars not set');
  process.exit(0);
}

const endpoint = `${url.replace(/\/$/, '')}/rest/v1/rpc/check_rls_disabled_tables`;

let res;
try {
  res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
} catch (err) {
  console.error(`[check-rls] Network error: ${err?.message || err}`);
  process.exit(1);
}

if (!res.ok) {
  const body = await res.text().catch(() => '');
  console.error(`[check-rls] Supabase RPC returned HTTP ${res.status}`);
  console.error(body.slice(0, 500));
  process.exit(1);
}

let rows;
try {
  rows = await res.json();
} catch {
  console.error('[check-rls] Could not parse Supabase response');
  process.exit(1);
}

if (Array.isArray(rows) && rows.length > 0) {
  console.error('');
  console.error('[check-rls] BUILD BLOCKED: RLS IS DISABLED on these public tables:');
  for (const r of rows) console.error(`   - ${r.tablename}`);
  console.error('');
  console.error('Fix before deploying:');
  console.error('  ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;');
  console.error('If the table is queried from the browser (anon key), also add a policy,');
  console.error('e.g.  CREATE POLICY "own_rows" ON public.<name> FOR SELECT');
  console.error('        TO authenticated USING (auth.uid() = user_id);');
  console.error('');
  process.exit(1);
}

console.log(`[check-rls] OK - all ${Array.isArray(rows) ? 0 : '?'} public tables have RLS enabled`);
