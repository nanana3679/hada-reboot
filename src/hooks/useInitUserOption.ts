'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { initUserOption } from '@/api/option';
import { Locale } from '@/types/Locale';

const REQUIRE_OPTIONS_ROUTES = ['/learning'];

function detectUtcOffset(): number {
  return -(new Date().getTimezoneOffset() / 60);
}

export function useInitUserOption(locale: string) {
  const initialized = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initUserOption(locale as Locale, detectUtcOffset()).catch(() => {
      if (REQUIRE_OPTIONS_ROUTES.some((route) => pathname.includes(route))) {
        setError(new Error('SETUP_REQUIRED'));
      }
    });
  }, [locale, pathname]);

  if (error) throw error;
}
