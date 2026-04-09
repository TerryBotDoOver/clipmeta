"use client";

import { useEffect, useState } from "react";

interface Flag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  updated_at: string;
}

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadFlags() {
    const res = await fetch("/api/admin/features");
    const data = await res.json();
    if (data.flags) setFlags(data.flags);
    setLoading(false);
  }

  useEffect(() => {
    loadFlags();
  }, []);

  async function toggleFlag(name: string, enabled: boolean) {
    setError(null);
    await fetch("/api/admin/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", name, enabled }),
    });
    await loadFlags();
  }

  async function addFlag() {
    if (!newName.trim()) return;
    setError(null);
    const res = await fetch("/api/admin/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
        description: newDesc.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setNewName("");
      setNewDesc("");
      await loadFlags();
    }
  }

  async function removeFlag(name: string) {
    if (!confirm(`Delete flag "${name}"?`)) return;
    await fetch("/api/admin/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", name }),
    });
    await loadFlags();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate-500">Loading flags...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">
        🚩 Feature Flags
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        Toggle features on/off without deploying. Wrap new features in{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          isFeatureEnabled(&apos;flag_name&apos;)
        </code>{" "}
        checks.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Existing flags */}
      <div className="mb-8 space-y-3">
        {flags.length === 0 ? (
          <p className="text-sm text-slate-400">
            No feature flags yet. Create one below.
          </p>
        ) : (
          flags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {flag.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      flag.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {flag.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                {flag.description && (
                  <p className="mt-1 text-xs text-slate-500">
                    {flag.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFlag(flag.name, !flag.enabled)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    flag.enabled
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {flag.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => removeFlag(flag.name)}
                  className="rounded-md px-2 py-1.5 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new flag */}
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Add New Flag
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="flag_name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-mono focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="flex-[2] rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
          <button
            onClick={addFlag}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Usage guide */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          How to Use
        </h2>
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            <strong>Server components / API routes:</strong>
          </p>
          <pre className="rounded bg-slate-50 p-2 text-xs overflow-x-auto">
{`import { isFeatureEnabled } from "@/lib/feature-flags";

if (await isFeatureEnabled("my_feature")) {
  // new feature code
}`}
          </pre>
          <p>
            <strong>Client components:</strong>
          </p>
          <pre className="rounded bg-slate-50 p-2 text-xs overflow-x-auto">
{`// Fetch from API route:
const res = await fetch("/api/admin/features");
const { flags } = await res.json();
const enabled = flags.find(f => f.name === "my_feature")?.enabled;`}
          </pre>
        </div>
      </div>
    </main>
  );
}
