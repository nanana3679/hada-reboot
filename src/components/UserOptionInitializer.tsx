'use client';

import { useInitUserOption } from '@/hooks/useInitUserOption';

export default function UserOptionInitializer() {
  useInitUserOption();
  return null;
}
