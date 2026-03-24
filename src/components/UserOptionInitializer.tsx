'use client';

import { useInitUserOption } from '@/hooks/useInitUserOption';

export default function UserOptionInitializer({ locale }: { locale: string }) {
  useInitUserOption(locale);
  return null;
}
