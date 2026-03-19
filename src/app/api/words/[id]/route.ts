import { NextRequest, NextResponse } from 'next/server';
import { mockWords } from '@/mocks/words';

// GET /api/words/:id?lang=en
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  const wordId = parseInt(id, 10);

  const word = mockWords.find((w) => w.id === wordId);
  if (!word) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  const meanings = word.translations.map((t) => ({
    foreignMeaning: t.definition,
    partsOfSpeech: word.partOfSpeech,
    pronunciation: word.pronunciation ?? '',
    languageCode: t.langCode,
    originalLanguage: word.origin ?? '',
    foreignWord: t.translation,
    relatedWords: '',
    inflection: '',
    exampleUsage: word.examples ?? '',
  }));

  // 같은 표제어의 다른 동형어 조회
  const homographs = mockWords
    .filter((w) => w.headword === word.headword && w.id !== word.id)
    .map((w) => ({
      cardId: w.id,
      homographNumber: w.homographNumber,
      partOfSpeech: w.partOfSpeech,
      definition: w.definition,
    }));

  return NextResponse.json({
    cardId: word.id,
    koreanWord: word.headword,
    homographNumber: word.homographNumber,
    level: word.level,
    topics: word.topics,
    definition: word.definition,
    meanings,
    homographs,
  });
}
