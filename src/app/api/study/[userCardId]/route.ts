import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { userCards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'] as const;
const STATE_MAP: Record<string, number> = { New: 0, Learning: 1, Review: 2, Relearning: 3 };

interface StudyInfoBody {
  due?: string;
  stability?: number;
  difficulty?: number;
  scheduledDays?: number;
  reps?: number;
  lapses?: number;
  state?: string;
  lastReview?: string;
}

// POST /api/study/:userCardId — 학습 결과 저장
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userCardId: string }> }
) {
  const { userCardId } = await params;
  const id = parseInt(userCardId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid userCardId' }, { status: 400 });
  }
  const body = (await request.json()) as StudyInfoBody;

  // TODO: auth 연동 후 실제 userId로 교체
  const userId = 1;

  const db = await getDb();
  const ownerCondition = and(eq(userCards.id, id), eq(userCards.userId, userId));

  const card = await db
    .select()
    .from(userCards)
    .where(ownerCondition)
    .get();

  if (!card) {
    return NextResponse.json({ error: 'UserCard not found' }, { status: 404 });
  }

  const stateValue = typeof body.state === 'string' ? STATE_MAP[body.state] ?? card.state : card.state;
  const now = new Date().toISOString();

  await db
    .update(userCards)
    .set({
      due: body.due ?? card.due,
      stability: body.stability ?? card.stability,
      difficulty: body.difficulty ?? card.difficulty,
      scheduledDays: body.scheduledDays ?? card.scheduledDays,
      reps: body.reps ?? card.reps,
      lapses: body.lapses ?? card.lapses,
      state: stateValue,
      lastReview: body.lastReview ?? now,
      updatedAt: now,
    })
    .where(ownerCondition)
    .run();

  const updated = await db.select().from(userCards).where(ownerCondition).get();
  if (!updated) {
    return NextResponse.json({ error: 'Failed to retrieve updated card' }, { status: 500 });
  }

  return NextResponse.json({
    due: updated.due,
    stability: updated.stability,
    difficulty: updated.difficulty,
    scheduledDays: updated.scheduledDays,
    reps: updated.reps,
    lapses: updated.lapses,
    state: STATE_NAMES[updated.state],
    lastReview: updated.lastReview,
  });
}
