'use server';

import { redirect } from 'next/navigation';
import { getAuth } from '@/auth';
import { cookies } from 'next/headers';

export async function signInWithGoogle() {
  const { signIn } = await getAuth();
  const url = await signIn('google', { redirect: false, redirectTo: '/' });
  redirect(url);
}

export async function signOutAction() {
  (await cookies()).delete('has-options');
  const { signOut } = await getAuth();
  const url = await signOut({ redirect: false });
  redirect(url);
}
