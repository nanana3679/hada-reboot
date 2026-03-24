'use server';

import { Locale } from '@/types/Locale';
import { Paginated } from '@/types/schemes';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const getWordDetail = async (wordId: number, lang: Locale = 'en') => {
  const db = await getDb();

  const word = await db.select().from(words).where(eq(words.id, wordId)).get();
  if (!word) return null;

  const trans = await db
    .select()
    .from(translations)
    .where(and(eq(translations.wordId, wordId), eq(translations.langCode, lang)))
    .get();

  const homographs = await db
    .select({
      wordId: words.id,
      homographNumber: words.homographNumber,
      partOfSpeech: words.partOfSpeech,
      definition: words.definition,
    })
    .from(words)
    .where(eq(words.headword, word.headword))
    .all();

  return {
    wordId: word.id,
    headword: word.headword,
    homographNumber: word.homographNumber,
    partOfSpeech: word.partOfSpeech ?? null,
    isNative: word.isNative ?? null,
    origin: word.origin ?? null,
    pronunciation: word.pronunciation ?? null,
    frequency: word.frequency ?? null,
    categories: word.categories,
    examples: word.examples,
    conjugation: word.conjugation ?? null,
    derivative: word.derivative ?? null,
    translation: trans?.translation?.[0] ?? '',
    definition: trans?.definition?.[0] ?? '',
    homographs: homographs
      .filter((h) => h.wordId !== word.id)
      .map((h) => ({
        wordId: h.wordId,
        homographNumber: h.homographNumber,
        partOfSpeech: h.partOfSpeech,
        definition: h.definition,
      })),
  };
};

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

interface SearchResult {
  wordId: number;
  headword: string;
  categories: string[];
  languageCode: string;
  translation: string;
}

export const searchWords = async (
  query: string,
  lang: Locale = 'en',
  type: 'korean' | 'foreign' = 'korean',
  page: number = 1,
  pageSize: number = 10,
): Promise<Paginated<SearchResult>> => {
  if (!query) {
    return { size: 0, pageSize, page, content: [] };
  }

  const db = await getDb();
  const offset = (page - 1) * pageSize;
  const pattern = `%${escapeLikePattern(query)}%`;
  const likeEscaped = (column: ReturnType<typeof sql>, p: string) =>
    sql`${column} LIKE ${p} ESCAPE '\\'`;

  if (type === 'korean') {
    const [countResult, results] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(words)
        .where(likeEscaped(sql`${words.headword}`, pattern))
        .get(),
      db
        .select({
          wordId: words.id,
          word: words.headword,
          categories: words.categories,
          translation: translations.translation,
        })
        .from(words)
        .leftJoin(
          translations,
          and(eq(translations.wordId, words.id), eq(translations.langCode, lang))
        )
        .where(likeEscaped(sql`${words.headword}`, pattern))
        .orderBy(words.id)
        .limit(pageSize)
        .offset(offset)
        .all(),
    ]);

    return {
      size: countResult?.count ?? 0,
      pageSize,
      page,
      content: results.map((r) => ({
        wordId: r.wordId,
        headword: r.word,
        categories: r.categories,
        languageCode: lang,
        translation: r.translation?.[0] ?? '',
      })),
    };
  }

  // 외국어 검색
  const foreignWhere = and(
    eq(translations.langCode, lang),
    sql`${translations.translation} LIKE ${pattern} ESCAPE '\\'`
  );

  const [countResult, results] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(translations)
      .innerJoin(words, eq(translations.wordId, words.id))
      .where(foreignWhere)
      .get(),
    db
      .select({
        wordId: words.id,
        word: words.headword,
        categories: words.categories,
        translation: translations.translation,
      })
      .from(translations)
      .innerJoin(words, eq(translations.wordId, words.id))
      .where(foreignWhere)
      .orderBy(words.id)
      .limit(pageSize)
      .offset(offset)
      .all(),
  ]);

  return {
    size: countResult?.count ?? 0,
    pageSize,
    page,
    content: results.map((r) => ({
      wordId: r.wordId,
      headword: r.word,
      categories: r.categories,
      languageCode: lang,
      translation: r.translation?.[0] ?? '',
    })),
  };
};
