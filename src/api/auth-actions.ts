'use server';

import { redirect } from 'next/navigation';
import { getAuth } from '@/auth';

export async function signInWithGoogle() {
  const { signIn } = await getAuth();
  const url = await signIn('google', { redirect: false, redirectTo: '/' });
  redirect(url);
}

export async function signOutAction() {
  const { signOut } = await getAuth();
  const url = await signOut({ redirect: false });
  redirect(url);
}
