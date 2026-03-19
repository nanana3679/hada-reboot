import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { words, userCards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/decks?type=level|topic
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') ?? 'level';
  const db = await getDb();

  // TODO: auth 연동 후 실제 userId로 교체
  const userId: number | null = null;

  if (type === 'level') {
    const results = await db
      .select({
        category: words.level,
        cardCounts: sql<number>`count(*)`,
      })
      .from(words)
      .groupBy(words.level)
      .all();

    let userCardStats: Record<string, { newCounts: number; learningCounts: number; overdueCounts: number; maturityCounts: number }> = {};

    if (userId) {
      const stats = await db
        .select({
          level: words.level,
          newCounts: sql<number>`sum(case when ${userCards.state} = 0 then 1 else 0 end)`,
          learningCounts: sql<number>`sum(case when ${userCards.state} in (1, 3) then 1 else 0 end)`,
          overdueCounts: sql<number>`sum(case when ${userCards.state} = 2 and ${userCards.due} <= datetime('now') then 1 else 0 end)`,
          maturityCounts: sql<number>`sum(case when ${userCards.state} = 2 and ${userCards.due} > datetime('now') then 1 else 0 end)`,
        })
        .from(userCards)
        .innerJoin(words, eq(userCards.wordId, words.id))
        .where(eq(userCards.userId, userId))
        .groupBy(words.level)
        .all();

      for (const s of stats) {
        userCardStats[s.level] = {
          newCounts: s.newCounts ?? 0,
          learningCounts: s.learningCounts ?? 0,
          overdueCounts: s.overdueCounts ?? 0,
          maturityCounts: s.maturityCounts ?? 0,
        };
      }
    }

    const decks = results.map((r) => ({
      category: r.category,
      cardCounts: r.cardCounts,
      ...(userCardStats[r.category] ?? {
        newCounts: 0,
        learningCounts: 0,
        overdueCounts: 0,
        maturityCounts: 0,
      }),
    }));

    return NextResponse.json({ size: decks.length, pageSize: 100, page: 1, content: decks });
  }

  // type === 'topic'
  const results = await db
    .select({
      category: sql<string>`json_each.value`,
      cardCounts: sql<number>`count(*)`,
    })
    .from(words)
    .innerJoin(sql`json_each(${words.topics})`, sql`1=1`)
    .groupBy(sql`json_each.value`)
    .all();

  let userCardStats: Record<string, { newCounts: number; learningCounts: number; overdueCounts: number; maturityCounts: number }> = {};

  if (userId) {
    const stats = await db
      .select({
        topic: sql<string>`json_each.value`,
        newCounts: sql<number>`sum(case when ${userCards.state} = 0 then 1 else 0 end)`,
        learningCounts: sql<number>`sum(case when ${userCards.state} in (1, 3) then 1 else 0 end)`,
        overdueCounts: sql<number>`sum(case when ${userCards.state} = 2 and ${userCards.due} <= datetime('now') then 1 else 0 end)`,
        maturityCounts: sql<number>`sum(case when ${userCards.state} = 2 and ${userCards.due} > datetime('now') then 1 else 0 end)`,
      })
      .from(userCards)
      .innerJoin(words, eq(userCards.wordId, words.id))
      .innerJoin(sql`json_each(${words.topics})`, sql`1=1`)
      .where(eq(userCards.userId, userId))
      .groupBy(sql`json_each.value`)
      .all();

    for (const s of stats) {
      userCardStats[s.topic] = {
        newCounts: s.newCounts ?? 0,
        learningCounts: s.learningCounts ?? 0,
        overdueCounts: s.overdueCounts ?? 0,
        maturityCounts: s.maturityCounts ?? 0,
      };
    }
  }

  const decks = results.map((r) => ({
    category: r.category,
    cardCounts: r.cardCounts,
    ...(userCardStats[r.category] ?? {
      newCounts: 0,
      learningCounts: 0,
      overdueCounts: 0,
      maturityCounts: 0,
    }),
  }));

  return NextResponse.json({ size: decks.length, pageSize: 100, page: 1, content: decks });
}
