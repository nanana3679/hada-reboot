'use server';

import { Locale } from '@/types/Locale';
import { Word } from '@/types/schemes';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const getWord = async (
  wordId: number,
  lang: Locale = 'en',
): Promise<Word | null> => {
  const db = await getDb();

  const word = await db.select().from(words).where(eq(words.id, wordId)).get();
  if (!word) return null;

  const trans = await db
    .select()
    .from(translations)
    .where(and(eq(translations.wordId, wordId), eq(translations.langCode, lang)))
    .get();

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
  };
};
