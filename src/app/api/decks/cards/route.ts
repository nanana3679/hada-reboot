import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

  const db = await getDb();
  const offset = (page - 1) * pageSize;
  const isLevel = ['easy', 'normal', 'hard'].includes(category);

  // 카테고리 필터 조건
  const whereCondition = isLevel
    ? eq(words.level, category as 'easy' | 'normal' | 'hard')
    : sql`EXISTS (SELECT 1 FROM json_each(${words.topics}) WHERE json_each.value = ${category})`;

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
        level: words.level,
        topics: words.topics,
        translation: translations.translation,
      })
      .from(words)
      .leftJoin(
        translations,
        and(eq(translations.wordId, words.id), eq(translations.langCode, lang))
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
    level: r.level,
    topics: r.topics,
    foreignWords: r.translation ?? [],
  }));

  return NextResponse.json({
    size: countResult?.count ?? 0,
    pageSize,
    page,
    content,
  });
}
