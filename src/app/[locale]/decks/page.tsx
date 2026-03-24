import React from 'react';
import { getAuth } from '@/auth';
import DecksClientPage from './clientPage';

export default async function DecksPage() {
  const { auth } = await getAuth();
  const session = await auth();
  const isLoggedIn = !!session;

  return <DecksClientPage isLoggedIn={isLoggedIn} />;
}
