'use server';

import { UserOption } from '@/types/schemes';
import { getDb } from '@/db';
import { userOptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuth } from '@/auth';
import { cookies } from 'next/headers';
import { Locale } from '@/types/Locale';

async function getUserId(): Promise<string | null> {
  const { auth } = await getAuth();
  const session = await auth();
  return session?.user?.id ?? null;
}

export const hasUserOption = async (): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) return false;

  const db = await getDb();
  const option = await db
    .select({ id: userOptions.id })
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .get();

  return !!option;
};

export const getUserOption = async (): Promise<UserOption> => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const db = await getDb();
  const option = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .get();

  if (!option) {
    throw new Error('User option not found');
  }

  return {
    dailyReviewWords: option.dailyReviewWords,
    dailyStudyWords: option.dailyStudyWords,
    utcOffset: option.utcOffset,
    languageCode: option.langCode as UserOption['languageCode'],
  };
};

export const postUserOption = async (userOption: UserOption): Promise<UserOption> => {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');

  const db = await getDb();

  await db
    .insert(userOptions)
    .values({
      userId,
      dailyReviewWords: userOption.dailyReviewWords,
      dailyStudyWords: userOption.dailyStudyWords,
      utcOffset: userOption.utcOffset,
      langCode: userOption.languageCode,
    })
    .onConflictDoUpdate({
      target: userOptions.userId,
      set: {
        dailyReviewWords: sql`coalesce(${userOption.dailyReviewWords}, ${userOptions.dailyReviewWords})`,
        dailyStudyWords: sql`coalesce(${userOption.dailyStudyWords}, ${userOptions.dailyStudyWords})`,
        utcOffset: sql`coalesce(${userOption.utcOffset}, ${userOptions.utcOffset})`,
        langCode: sql`coalesce(${userOption.languageCode}, ${userOptions.langCode})`,
      },
    })
    .run();

  return getUserOption();
};

export const initUserOption = async (languageCode: Locale, utcOffset: number): Promise<void> => {
  const exists = await hasUserOption();

  if (!exists) {
    await postUserOption({
      languageCode,
      utcOffset,
      dailyReviewWords: 20,
      dailyStudyWords: 10,
    });
  }

  (await cookies()).set('has-options', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
};
