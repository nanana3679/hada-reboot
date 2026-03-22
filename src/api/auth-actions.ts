'use server';

import { getAuth } from '@/auth';

export async function signInWithGoogle() {
  const { signIn } = await getAuth();
  await signIn('google');
}

export async function signOutAction() {
  const { signOut } = await getAuth();
  await signOut();
}
