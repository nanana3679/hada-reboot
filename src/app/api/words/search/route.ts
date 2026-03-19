import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and, like, sql } from 'drizzle-orm';

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

  const db = await getDb();
  const offset = (page - 1) * pageSize;

  if (type === 'korean') {
    // 한국어 검색: headword LIKE
    const pattern = `%${query}%`;

    const [countResult, results] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(words)
        .where(like(words.headword, pattern))
        .get(),
      db
        .select({
          cardId: words.id,
          koreanWord: words.headword,
          difficulty: words.level,
        })
        .from(words)
        .where(like(words.headword, pattern))
        .limit(pageSize)
        .offset(offset)
        .all(),
    ]);

    // 각 결과에 번역 추가
    const content = await Promise.all(
      results.map(async (r) => {
        const trans = await db
          .select()
          .from(translations)
          .where(and(eq(translations.wordId, r.cardId), eq(translations.langCode, lang)))
          .get();
        return {
          cardId: r.cardId,
          koreanWord: r.koreanWord,
          difficulty: r.difficulty,
          languageCode: lang,
          foreignWord: trans?.translation?.[0] ?? '',
        };
      })
    );

    return NextResponse.json({
      size: countResult?.count ?? 0,
      pageSize,
      page,
      content,
    });
  }

  // 외국어 검색: translation LIKE
  const pattern = `%${query}%`;

  const foreignWhere = and(
    eq(translations.langCode, lang),
    sql`${translations.translation} LIKE ${pattern}`
  );

  const results = await db
    .select({
      cardId: words.id,
      koreanWord: words.headword,
      difficulty: words.level,
      translation: translations.translation,
    })
    .from(translations)
    .innerJoin(words, eq(translations.wordId, words.id))
    .where(foreignWhere)
    .limit(pageSize)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(translations)
    .innerJoin(words, eq(translations.wordId, words.id))
    .where(foreignWhere)
    .get();

  const content = results.map((r) => ({
    cardId: r.cardId,
    koreanWord: r.koreanWord,
    difficulty: r.difficulty,
    languageCode: lang,
    foreignWord: r.translation?.[0] ?? '',
  }));

  return NextResponse.json({
    size: countResult?.count ?? 0,
    pageSize,
    page,
    content,
  });
}
