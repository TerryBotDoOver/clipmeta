"use client";

export function ManageBillingButton() {
  async function handleClick() {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Portal error:', err);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      Manage Billing
    </button>
  );
}
