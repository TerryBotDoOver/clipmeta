'use client';

import { useState } from 'react';

type ReasonKey =
  | 'too_expensive'
  | 'not_enough_features'
  | 'switching_to_competitor'
  | 'not_using_enough'
  | 'privacy'
  | 'other';

const REASONS: { value: ReasonKey; label: string }[] = [
  { value: 'too_expensive',           label: 'Too expensive' },
  { value: 'not_enough_features',     label: "Missing features I need" },
  { value: 'switching_to_competitor', label: 'Switching to a competitor' },
  { value: 'not_using_enough',        label: "I'm not using it enough" },
  { value: 'privacy',                 label: 'Privacy concerns' },
  { value: 'other',                   label: 'Other' },
];

export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReasonKey | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const reset = () => {
    setReason('');
    setNotes('');
    setError('');
    setDone(false);
    setSubmitting(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 200);
  };

  const submit = async () => {
    if (!reason) {
      setError('Please pick a reason before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/account/request-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason_category: reason, reason_text: notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Request failed');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-500/40 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
      >
        Delete account
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-card p-6 shadow-xl"
          >
            {done ? (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Request received</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Thanks for the feedback. Terry will review your request and delete your
                  account personally within 24 hours. You will get an email once it is done.
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={close}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Delete your account</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Before you go, we would appreciate knowing why. Your answer helps us
                  improve ClipMeta for everyone else.
                </p>

                <div className="mt-5 space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="h-4 w-4 accent-red-500"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>

                <label className="mt-5 block text-xs font-medium text-muted-foreground">
                  Anything else you want to share? (optional)
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-red-500/60"
                    placeholder="What could we have done better?"
                    maxLength={2000}
                  />
                </label>

                {error && (
                  <p className="mt-3 text-xs text-red-400">{error}</p>
                )}

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    onClick={close}
                    disabled={submitting}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting || !reason}
                    className="rounded-lg bg-red-500/90 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Request deletion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
