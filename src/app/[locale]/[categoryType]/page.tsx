import React from 'react';
import { getAuth } from '@/auth';
import CategoryTypeClientPage from './clientPage';

export default async function CategoryTypePage() {
  const { auth } = await getAuth();
  const session = await auth();
  const isLoggedIn = !!session;

  return <CategoryTypeClientPage isLoggedIn={isLoggedIn} />;
}
