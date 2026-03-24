'use server';

import { StudyType, CardState, CardDetail } from '@/types/schemes';
import { Category } from '@/types/Category';
import { Locale } from '@/types/Locale';
import { getDb } from '@/db';
import { words, userCards, translations, userOptions } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { invalidateUserDeckCache } from '@/lib/cache';
import { getAuth } from '@/auth';
import { createEmptyCard, dateDiffInDays } from 'ts-fsrs';
import { camelizeKeys } from 'humps';

async function getUserId(): Promise<string | null> {
  const { auth } = await getAuth();
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getDailyLimits(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  const options = await db
    .select({ dailyStudyWords: userOptions.dailyStudyWords, dailyReviewWords: userOptions.dailyReviewWords })
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .get();
  return { dailyStudyWords: options?.dailyStudyWords ?? 10, dailyReviewWords: options?.dailyReviewWords ?? 20 };
}

export const getCards = async (studyType: StudyType, category: Category, lang: Locale = 'en') => {
  const userId = await getUserId();
  if (!userId) {
    return { size: 0, pageSize: 100, page: 1, content: [] as CardDetail[] };
  }
  const db = await getDb();
  const { dailyStudyWords, dailyReviewWords } = await getDailyLimits(db, userId);

  const categoryCondition = sql`EXISTS (SELECT 1 FROM json_each(${words.categories}) WHERE json_each.value = ${category})`;

  if (studyType === 'new') {
    // user_cards 레코드가 없는 단어 = New (RFC-0011)
    const results = await db
      .select({
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
      })
      .from(words)
      .leftJoin(
        userCards,
        and(eq(userCards.wordId, words.id), eq(userCards.userId, userId))
      )
      .leftJoin(translations, and(eq(translations.wordId, words.id), eq(translations.langCode, lang)))
      .where(and(isNull(userCards.id), categoryCondition))
      .limit(dailyStudyWords)
      .all();

    const emptyFsrs = camelizeKeys(createEmptyCard()) as unknown as CardState;
    const content: CardDetail[] = results.map((r) => ({
      userCardId: null,
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
      fsrs: emptyFsrs,
    }));

    return { size: content.length, pageSize: dailyStudyWords, page: 1, content };
  }

  // review: 학습 기록이 있고 overdue 상태인 카드
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
    .where(and(
      eq(userCards.userId, userId),
      sql`${userCards.state} != 0`,
      sql`${userCards.due} <= datetime('now')`,
      categoryCondition,
    ))
    .limit(dailyReviewWords)
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

  return { size: content.length, pageSize: dailyReviewWords, page: 1, content };
};

export const postFsrs = async (userCardId: number | null, wordId: number, cardState: CardState) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }
  const db = await getDb();
  const now = new Date().toISOString();

  const stateValue = (cardState.state >= 0 && cardState.state <= 3)
    ? cardState.state
    : 0;

  if (userCardId === null) {
    // New card — INSERT
    const result = await db
      .insert(userCards)
      .values({
        userId,
        wordId,
        due: cardState.due.toISOString(),
        stability: cardState.stability,
        difficulty: cardState.difficulty,
        scheduledDays: cardState.scheduledDays,
        reps: cardState.reps,
        lapses: cardState.lapses,
        state: stateValue,
        lastReview: cardState.lastReview?.toISOString() ?? now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: userCards.id })
      .get();

    await invalidateUserDeckCache(userId);

    return {
      userCardId: result.id,
      fsrs: cardState,
    };
  }

  // Existing card — UPDATE
  const ownerCondition = and(eq(userCards.id, userCardId), eq(userCards.userId, userId));

  const card = await db.select().from(userCards).where(ownerCondition).get();
  if (!card) {
    throw new Error('UserCard not found');
  }

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

  return {
    userCardId,
    fsrs: cardState,
  };
};
