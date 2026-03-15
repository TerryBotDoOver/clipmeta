import { createClient } from "@supabase/supabase-js";

// Terry note: Add auth to this page before going public.

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: emails, error } = await supabase
    .from("email_captures")
    .select("email, source, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Terry note: Add auth to this page before going public.
      </div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Email Captures</h1>

      {error ? (
        <p className="text-red-600">Failed to load: {error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Source</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {emails?.map((row) => (
                <tr key={row.email} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{row.email}</td>
                  <td className="px-4 py-3 text-slate-600">{row.source}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {emails?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No email captures yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">{emails?.length ?? 0} total</p>
    </main>
  );
}
