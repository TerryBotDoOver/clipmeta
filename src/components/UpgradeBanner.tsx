'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';

const DISMISS_KEY = 'upgrade_banner_dismissed_until';

export function UpgradeBanner() {
  const { plan, loading } = useProfile();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (plan !== 'free') return;

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    setVisible(true);
  }, [plan, loading]);

  function dismiss() {
    // Dismiss for 24 hours
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #6d28d9 0%, #8b5cf6 100%)',
        color: '#ffffff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: 500,
        position: 'relative',
      }}
    >
      <span>
        Want more clips? Use code{' '}
        <strong style={{ fontWeight: 700 }}>FOUNDING50</strong> for 50% off your first 3 months.
      </span>
      <Link
        href="/pricing"
        style={{
          color: '#ffffff',
          fontWeight: 700,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        See Plans
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '4px',
        }}
      >
        &times;
      </button>
    </div>
  );
}
