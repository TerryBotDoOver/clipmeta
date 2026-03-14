"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface NameFormProps {
  initialName: string;
}

export default function NameForm({ initialName }: NameFormProps) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  async function handleSave() {
    if (!name.trim() || name.trim() === initialName) return;
    setStatus("saving");
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });
    if (error) {
      setStatus("error");
    } else {
      setStatus("saved");
      router.refresh(); // re-fetch server components with updated metadata
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <div className="flex-1 mr-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Display Name
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setStatus("idle"); }}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Your name"
          className="mt-1 w-full max-w-xs rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={status === "saving" || !name.trim() || name.trim() === initialName}
        className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : "Save"}
      </button>
      {status === "error" && (
        <p className="ml-3 text-xs text-red-400">Failed to save.</p>
      )}
    </div>
  );
}
