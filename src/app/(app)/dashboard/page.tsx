import { supabase } from "@/lib/supabase";

export default async function DashboardPage() {
  const { data, error } = await supabase.from("projects").select("*").limit(1);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Welcome to ClipMeta
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This is the first Supabase connection test for the real ClipMeta app.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Supabase connection test
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <p>
              <span className="font-semibold text-slate-900">Data returned:</span>{" "}
              <span className="text-slate-600">
                {data ? JSON.stringify(data) : "null"}
              </span>
            </p>

            <p>
              <span className="font-semibold text-slate-900">Error:</span>{" "}
              <span className="text-slate-600">
                {error ? error.message : "none"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}