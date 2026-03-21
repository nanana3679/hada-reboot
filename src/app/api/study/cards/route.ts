import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { words, userCards } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'] as const;

// GET /api/study/cards?studyType=new|review&category=easy
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const studyType = searchParams.get('studyType') ?? 'new';
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }

  // TODO: auth 연동 후 실제 userId로 교체
  const userId = 1;

  const db = await getDb();
  const categoryCondition = sql`EXISTS (SELECT 1 FROM json_each(${words.topics}) WHERE json_each.value = ${category})`;

  const stateCondition =
    studyType === 'new'
      ? eq(userCards.state, 0)
      : and(
          sql`${userCards.state} != 0`,
          sql`${userCards.due} <= datetime('now')`
        );

  const results = await db
    .select({
      userCardId: userCards.id,
      cardId: words.id,
      koreanWord: words.headword,
      homographNumber: words.homographNumber,
      topics: words.topics,
      due: userCards.due,
      stability: userCards.stability,
      difficulty: userCards.difficulty,
      scheduledDays: userCards.scheduledDays,
      reps: userCards.reps,
      lapses: userCards.lapses,
      state: userCards.state,
      lastReview: userCards.lastReview,
    })
    .from(userCards)
    .innerJoin(words, eq(userCards.wordId, words.id))
    .where(and(eq(userCards.userId, userId), stateCondition, categoryCondition))
    .all();

  const content = results.map((r) => ({
    userCardId: r.userCardId,
    koreanCard: {
      cardId: r.cardId,
      koreanWord: r.koreanWord,
      homographNumber: r.homographNumber,
      topics: r.topics,
    },
    studyInfo: {
      due: r.due,
      stability: r.stability,
      difficulty: r.difficulty,
      scheduledDays: r.scheduledDays,
      reps: r.reps,
      lapses: r.lapses,
      state: STATE_NAMES[r.state],
      lastReview: r.lastReview,
    },
  }));

  return NextResponse.json({
    size: content.length,
    pageSize: 100,
    page: 1,
    content,
  });
}
