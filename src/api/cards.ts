'use server';

import { Locale } from '@/types/Locale';
import { KoreanCardDetail } from '@/types/schemes';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const getKoreanCardDetail = async (
  cardId: number,
  lang: Locale = 'en',
): Promise<KoreanCardDetail | null> => {
  const db = await getDb();

  const word = await db.select().from(words).where(eq(words.id, cardId)).get();
  if (!word) return null;

  const trans = await db
    .select()
    .from(translations)
    .where(and(eq(translations.wordId, cardId), eq(translations.langCode, lang)))
    .get();

  return {
    cardId: word.id,
    koreanWord: word.headword,
    homographNumber: word.homographNumber,
    topics: word.topics,
    meanings: trans
      ? [
          {
            foreignMeaning: trans.definition?.[0] ?? '',
            partsOfSpeech: word.partOfSpeech ?? '',
            pronunciation: word.pronunciation ?? '',
            languageCode: lang,
            originalLanguage: word.origin ?? '',
            foreignWord: trans.translation?.[0] ?? '',
            relatedWords: '',
            inflection: word.conjugation ?? '',
            exampleUsage: word.examples?.[0] ?? '',
          },
        ]
      : [],
  };
};
