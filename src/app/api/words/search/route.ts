import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { words, translations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

function likeEscaped(column: ReturnType<typeof sql>, pattern: string) {
  return sql`${column} LIKE ${pattern} ESCAPE '\\'`;
}

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
  const pattern = `%${escapeLikePattern(query)}%`;

  if (type === 'korean') {
    const [countResult, results] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(words)
        .where(likeEscaped(sql`${words.headword}`, pattern))
        .get(),
      db
        .select({
          cardId: words.id,
          koreanWord: words.headword,
          topics: words.topics,
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

    const content = results.map((r) => ({
      cardId: r.cardId,
      koreanWord: r.koreanWord,
      topics: r.topics,
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

  // 외국어 검색: translation LIKE
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
        cardId: words.id,
        koreanWord: words.headword,
        topics: words.topics,
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

  const content = results.map((r) => ({
    cardId: r.cardId,
    koreanWord: r.koreanWord,
    topics: r.topics,
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
