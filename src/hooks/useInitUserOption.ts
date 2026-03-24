'use client';

import { useEffect, useRef } from 'react';
import { initUserOption } from '@/api/option';
import { Locale } from '@/types/Locale';

function detectUtcOffset(): number {
  return -(new Date().getTimezoneOffset() / 60);
}

export function useInitUserOption(locale: string) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initUserOption(locale as Locale, detectUtcOffset()).catch(console.error);
  }, [locale]);
}
