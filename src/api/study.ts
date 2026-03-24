'use server';

import { StudyType, CardState, CardDetail } from '@/types/schemes';
import { Category } from '@/types/Category';
import { Locale } from '@/types/Locale';
import { getDb } from '@/db';
import { words, userCards, translations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { invalidateUserDeckCache } from '@/lib/cache';
import { getAuth } from '@/auth';
import { dateDiffInDays } from 'ts-fsrs';

async function getUserId(): Promise<string | null> {
  const { auth } = await getAuth();
  const session = await auth();
  return session?.user?.id ?? null;
}

export const getLearningCards = async (studyType: StudyType, category: Category, lang: Locale = 'en') => {
  const userId = await getUserId();
  if (!userId) {
    return { size: 0, pageSize: 100, page: 1, content: [] };
  }
  const db = await getDb();

  const categoryCondition = sql`EXISTS (SELECT 1 FROM json_each(${words.categories}) WHERE json_each.value = ${category})`;

  const stateCondition =
    studyType === 'new'
      ? eq(userCards.state, 0)
      : and(
          sql`${userCards.state} != 0`,
          sql`${userCards.due} <= datetime('now')`
        );

  const results = await db
    .select({
      userCardId: userCards.id,
      wordId: words.id,
      headword: words.headword,
      homographNumber: words.homographNumber,
      partOfSpeech: words.partOfSpeech,
      isNative: words.isNative,
      origin: words.origin,
      pronunciation: words.pronunciation,
      frequency: words.frequency,
      categories: words.categories,
      examples: words.examples,
      conjugation: words.conjugation,
      derivative: words.derivative,
      translation: translations.translation,
      transDefinition: translations.definition,
      due: userCards.due,
      stability: userCards.stability,
      difficulty: userCards.difficulty,
      scheduledDays: userCards.scheduledDays,
      reps: userCards.reps,
      lapses: userCards.lapses,
      state: userCards.state,
      lastReview: userCards.lastReview,
    })
    .from(userCards)
    .innerJoin(words, eq(userCards.wordId, words.id))
    .leftJoin(translations, and(eq(translations.wordId, words.id), eq(translations.langCode, lang)))
    .where(and(eq(userCards.userId, userId), stateCondition, categoryCondition))
    .all();

  const content: CardDetail[] = results.map((r) => ({
    userCardId: r.userCardId,
    word: {
      wordId: r.wordId,
      headword: r.headword,
      homographNumber: r.homographNumber,
      partOfSpeech: r.partOfSpeech ?? null,
      isNative: r.isNative ?? null,
      origin: r.origin ?? null,
      pronunciation: r.pronunciation ?? null,
      frequency: r.frequency ?? null,
      categories: r.categories,
      examples: r.examples,
      conjugation: r.conjugation ?? null,
      derivative: r.derivative ?? null,
      translation: r.translation?.[0] ?? '',
      definition: r.transDefinition?.[0] ?? '',
    },
    fsrs: {
      due: new Date(r.due),
      stability: r.stability,
      difficulty: r.difficulty,
      elapsedDays: r.lastReview ? dateDiffInDays(new Date(r.lastReview), new Date()) : 0,
      scheduledDays: r.scheduledDays,
      reps: r.reps,
      lapses: r.lapses,
      learningSteps: 0,
      state: r.state,
      lastReview: r.lastReview ? new Date(r.lastReview) : undefined,
    } as CardState,
  }));

  return { size: content.length, pageSize: 100, page: 1, content };
};

export const postStudyInfo = async (userCardId: number, cardState: CardState) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }
  const db = await getDb();

  const ownerCondition = and(eq(userCards.id, userCardId), eq(userCards.userId, userId));

  const card = await db.select().from(userCards).where(ownerCondition).get();
  if (!card) {
    throw new Error('UserCard not found');
  }

  const stateValue = (cardState.state >= 0 && cardState.state <= 3)
    ? cardState.state
    : card.state;
  const now = new Date().toISOString();

  await db
    .update(userCards)
    .set({
      due: cardState.due.toISOString(),
      stability: cardState.stability,
      difficulty: cardState.difficulty,
      scheduledDays: cardState.scheduledDays,
      reps: cardState.reps,
      lapses: cardState.lapses,
      state: stateValue,
      lastReview: cardState.lastReview?.toISOString() ?? now,
      updatedAt: now,
    })
    .where(ownerCondition)
    .run();

  await invalidateUserDeckCache(userId);

  const updated = await db.select().from(userCards).where(ownerCondition).get();
  if (!updated) {
    throw new Error('Failed to retrieve updated card');
  }

  return {
    due: new Date(updated.due),
    stability: updated.stability,
    difficulty: updated.difficulty,
    elapsedDays: updated.lastReview ? dateDiffInDays(new Date(updated.lastReview), new Date()) : 0,
    scheduledDays: updated.scheduledDays,
    reps: updated.reps,
    lapses: updated.lapses,
    learningSteps: 0,
    state: updated.state,
    lastReview: updated.lastReview ? new Date(updated.lastReview) : undefined,
  } as CardState;
};
