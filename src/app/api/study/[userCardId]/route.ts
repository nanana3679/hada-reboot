import { NextRequest, NextResponse } from 'next/server';
import { mockUserCards } from '@/mocks/study';

const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'] as const;

// POST /api/study/:userCardId — 학습 결과 저장
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userCardId: string }> }
) {
  const { userCardId } = await params;
  const id = parseInt(userCardId, 10);
  const body = await request.json();

  const card = mockUserCards.find((uc) => uc.id === id);
  if (!card) {
    return NextResponse.json({ error: 'UserCard not found' }, { status: 404 });
  }

  // Mock: 받은 studyInfo를 그대로 반환 (실제 구현 시 DB 업데이트)
  const studyInfo = {
    due: body.due ?? card.due,
    stability: body.stability ?? card.stability,
    difficulty: body.difficulty ?? card.difficulty,
    scheduledDays: body.scheduledDays ?? card.scheduledDays,
    reps: body.reps ?? card.reps,
    lapses: body.lapses ?? card.lapses,
    state: body.state ?? STATE_NAMES[card.state],
    lastReview: body.lastReview ?? new Date().toISOString(),
  };

  return NextResponse.json(studyInfo);
}
