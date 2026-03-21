'use server';

import { UserOption } from '@/types/schemes';
import { getDb } from '@/db';
import { userOptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuth } from '@/auth';

async function getUserId(): Promise<string | null> {
  const { auth } = await getAuth();
  const session = await auth();
  return session?.user?.id ?? null;
}

export const getUserOption = async (): Promise<UserOption> => {
  const userId = await getUserId();
  if (!userId) {
    return { dailyReviewWords: 20, dailyStudyWords: 10, utcOffset: 0, languageCode: 'en' };
  }

  const db = await getDb();
  const option = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .get();

  if (!option) {
    return { dailyReviewWords: 20, dailyStudyWords: 10, utcOffset: 0, languageCode: 'en' };
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
