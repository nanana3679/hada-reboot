'use client';

import { useEffect, useRef } from 'react';
import { hasUserOption, postUserOption } from '@/api/option';
import { Locale } from '@/types/Locale';

const SUPPORTED_LOCALES: Locale[] = [
  'ar', 'en', 'es', 'fr', 'id', 'ja', 'ko', 'mn', 'ru', 'th', 'vi', 'zh',
];

function detectUtcOffset(): number {
  return -(new Date().getTimezoneOffset() / 60);
}

function detectLocale(): Locale {
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }
  return 'en';
}

export function useInitUserOption() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const exists = await hasUserOption();
      if (exists) return;

      await postUserOption({
        utcOffset: detectUtcOffset(),
        languageCode: detectLocale(),
        dailyReviewWords: 20,
        dailyStudyWords: 10,
      });
    };

    init().catch(console.error);
  }, []);
}
