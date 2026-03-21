'use server';

import { Locale } from '@/types/Locale';
import { Paginated, UserStudyHistory, Deck, KoreanCardWithForeignWords } from '@/types/schemes';
import { Category } from '@/types/Category';
import { getDb } from '@/db';
import { words, translations, userStudyHistory } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { userCards } from '@/db/schema';
import {
  getCached,
  setGlobalDeckCache,
  setUserDeckCache,
  GLOBAL_DECK_KEY,
  userDeckKey,
} from '@/lib/cache';

// TODO: auth 연동 후 실제 userId로 교체
const getUserId = (): number | null => null;

type GlobalDeckStats = Record<string, number>;
type UserCardStats = Record<string, {
  newCounts: number;
  learningCounts: number;
  overdueCounts: number;
  maturityCounts: number;
}>;

export const getDecks = async (): Promise<Paginated<Deck>> => {
  const userId = getUserId();

  // 1. 글로벌 캐시 → 미스 시 DB 쿼리
  let globalStats = await getCached<GlobalDeckStats>(GLOBAL_DECK_KEY);

  if (!globalStats) {
    const db = await getDb();
    const results = await db
      .select({
        category: sql<string>`json_each.value`,
        cardCounts: sql<number>`count(*)`,
      })
      .from(words)
      .innerJoin(sql`json_each(${words.topics})`, sql`1=1`)
      .groupBy(sql`json_each.value`)
      .all();

    globalStats = {};
    for (const r of results) {
      globalStats[r.category] = r.cardCounts;
    }

    await setGlobalDeckCache(globalStats);
  }

  // 2. 유저 캐시 → 미스 시 DB 쿼리
  let userCardStats: UserCardStats = {};

  if (userId) {
    const cached = await getCached<UserCardStats>(userDeckKey(userId));

    if (cached) {
      userCardStats = cached;
    } else {
      const db = await getDb();
      const stats = await db
        .select({
          category: sql<string>`json_each.value`,
          newCounts: sql<number>`sum(case when ${userCards.state} = 0 then 1 else 0 end)`,
          learningCounts: sql<number>`sum(case when ${userCards.state} in (1, 3) then 1 else 0 end)`,
          overdueCounts: sql<number>`sum(case when ${userCards.state} = 2 and ${userCards.due} <= datetime('now') then 1 else 0 end)`,
          maturityCounts: sql<number>`sum(case when ${userCards.state} = 2 and ${userCards.due} > datetime('now') then 1 else 0 end)`,
        })
        .from(userCards)
        .innerJoin(words, eq(userCards.wordId, words.id))
        .innerJoin(sql`json_each(${words.topics})`, sql`1=1`)
        .where(eq(userCards.userId, userId))
        .groupBy(sql`json_each.value`)
        .all();

      for (const s of stats) {
        userCardStats[s.category] = {
          newCounts: s.newCounts ?? 0,
          learningCounts: s.learningCounts ?? 0,
          overdueCounts: s.overdueCounts ?? 0,
          maturityCounts: s.maturityCounts ?? 0,
        };
      }

      await setUserDeckCache(userId, userCardStats);
    }
  }

  // 3. 글로벌 + 유저 합쳐서 응답
  const decks = Object.entries(globalStats).map(([category, cardCounts]) => ({
    category,
    cardCounts: cardCounts as number,
    ...(userCardStats[category] ?? {
      newCounts: 0,
      learningCounts: 0,
      overdueCounts: 0,
      maturityCounts: 0,
    }),
  }));

  return { size: decks.length, pageSize: 100, page: 1, content: decks };
};

export const getCardsFromDeck = async (locale: Locale, category: Category, page: number): Promise<Paginated<KoreanCardWithForeignWords>> => {
  const db = await getDb();
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const whereCondition = sql`EXISTS (SELECT 1 FROM json_each(${words.topics}) WHERE json_each.value = ${category})`;

  const [countResult, results] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(words)
      .where(whereCondition)
      .get(),
    db
      .select({
        cardId: words.id,
        koreanWord: words.headword,
        homographNumber: words.homographNumber,
        topics: words.topics,
        translation: translations.translation,
      })
      .from(words)
      .leftJoin(
        translations,
        and(eq(translations.wordId, words.id), eq(translations.langCode, locale))
      )
      .where(whereCondition)
      .orderBy(words.id)
      .limit(pageSize)
      .offset(offset)
      .all(),
  ]);

  const content = results.map((r) => ({
    cardId: r.cardId,
    koreanWord: r.koreanWord,
    homographNumber: r.homographNumber,
    topics: r.topics,
    foreignWords: r.translation ?? [],
  }));

  return { size: countResult?.count ?? 0, pageSize, page, content };
};

export const getUserStudyHistories = async (): Promise<Paginated<UserStudyHistory>> => {
  const db = await getDb();
  const userId = getUserId();

  if (!userId) {
    return { size: 0, pageSize: 100, page: 1, content: [] };
  }

  const results = await db
    .select({
      studyType: userStudyHistory.studyType,
      category: userStudyHistory.category,
      studyDate: userStudyHistory.studyDate,
    })
    .from(userStudyHistory)
    .where(eq(userStudyHistory.userId, userId))
    .all();

  return { size: results.length, pageSize: 100, page: 1, content: results };
};
