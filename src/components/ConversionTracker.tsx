'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fbEvent } from '@/components/MetaPixel';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    rdt?: (...args: unknown[]) => void;
  }
}

export function ConversionTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      // Google Ads conversion
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: 'AW-18071437581/oEmICIrewpccEI2CkalD',
          value: 1.0,
          currency: 'USD',
        });
      }

      // Meta Pixel purchase + subscribe events
      fbEvent('Purchase', {
        value: 9.00,
        currency: 'USD',
        content_name: 'ClipMeta Subscription',
        content_type: 'product',
      });
      fbEvent('Subscribe', {
        value: 9.00,
        currency: 'USD',
      });

      // Reddit Pixel purchase event
      if (window.rdt) {
        window.rdt('track', 'Purchase', { value: 9.00, currency: 'USD' });
      }
    }
  }, [searchParams]);

  return null;
}
