import { NextRequest, NextResponse } from 'next/server';
import { mockWords } from '@/mocks/words';

// GET /api/words/search?q=hello&lang=en&type=korean|foreign&page=1&pageSize=10
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') ?? '';
  const lang = searchParams.get('lang') ?? 'en';
  const type = searchParams.get('type') ?? 'korean';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);

  if (!query) {
    return NextResponse.json({ size: 0, pageSize, page, content: [] });
  }

  const lowerQuery = query.toLowerCase();

  const filtered = type === 'korean'
    ? mockWords.filter((w) => w.headword.includes(query) || w.definition.includes(query))
    : mockWords.filter((w) =>
        w.translations.some(
          (t) => t.langCode === lang && t.translation.toLowerCase().includes(lowerQuery)
        )
      );

  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const content = paged.map((w) => {
    const trans = w.translations.find((t) => t.langCode === lang);
    return {
      cardId: w.id,
      koreanWord: w.headword,
      difficulty: w.level,
      languageCode: lang,
      foreignWord: trans?.translation ?? '',
    };
  });

  return NextResponse.json({ size: filtered.length, pageSize, page, content });
}
