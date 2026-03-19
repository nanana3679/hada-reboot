import { NextRequest, NextResponse } from 'next/server';
import { mockWords } from '@/mocks/words';

// GET /api/decks/cards?category=easy&lang=en&page=1&pageSize=100
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const lang = searchParams.get('lang') ?? 'en';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '100', 10);

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }

  // level(easy/normal/hard) 또는 topic(CONCEPT/ECONOMY/...)으로 필터
  const isLevel = ['easy', 'normal', 'hard'].includes(category);
  const filtered = isLevel
    ? mockWords.filter((w) => w.level === category)
    : mockWords.filter((w) => w.topics.includes(category.toUpperCase()));

  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const content = paged.map((w) => ({
    cardId: w.id,
    koreanWord: w.headword,
    homographNumber: w.homographNumber,
    level: w.level,
    topics: w.topics,
    foreignWords: w.translations
      .filter((t) => t.langCode === lang)
      .map((t) => t.translation),
  }));

  return NextResponse.json({
    size: filtered.length,
    pageSize,
    page,
    content,
  });
}
