import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/words/:id?lang=en
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  const wordId = parseInt(id, 10);

  const db = await getDb();

  const word = await db.select().from(words).where(eq(words.id, wordId)).get();
  if (!word) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  // 해당 언어 번역
  const trans = await db
    .select()
    .from(translations)
    .where(and(eq(translations.wordId, wordId), eq(translations.langCode, lang)))
    .get();

  // 같은 표제어의 다른 동형어
  const homographs = await db
    .select({
      cardId: words.id,
      homographNumber: words.homographNumber,
      partOfSpeech: words.partOfSpeech,
      definition: words.definition,
    })
    .from(words)
    .where(eq(words.headword, word.headword))
    .all();

  return NextResponse.json({
    cardId: word.id,
    koreanWord: word.headword,
    homographNumber: word.homographNumber,
    topics: word.topics,
    definition: word.definition,
    meanings: trans
      ? {
          foreignMeaning: trans.definition,
          partsOfSpeech: word.partOfSpeech,
          pronunciation: word.pronunciation ?? '',
          languageCode: trans.langCode,
          originalLanguage: word.origin ?? '',
          foreignWord: trans.translation,
          relatedWords: '',
          inflection: word.conjugation ?? '',
          exampleUsage: word.examples,
        }
      : null,
    homographs: homographs
      .filter((h) => h.cardId !== word.id)
      .map((h) => ({
        cardId: h.cardId,
        homographNumber: h.homographNumber,
        partOfSpeech: h.partOfSpeech,
        definition: h.definition,
      })),
  });
}
