import { NextRequest, NextResponse } from 'next/server';
import { mockWords } from '@/mocks/words';
import { mockUserCards } from '@/mocks/study';

const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'] as const;

// GET /api/study/cards?studyType=new|review&category=easy
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const studyType = searchParams.get('studyType') ?? 'new';
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }

  // 해당 카테고리에 속하는 단어 ID 필터
  const isLevel = ['easy', 'normal', 'hard'].includes(category);
  const wordsInCategory = isLevel
    ? mockWords.filter((w) => w.level === category)
    : mockWords.filter((w) => w.topics.includes(category.toUpperCase()));
  const wordIds = new Set(wordsInCategory.map((w) => w.id));

  // studyType에 따라 userCard 필터
  let filtered = mockUserCards.filter((uc) => wordIds.has(uc.wordId));

  if (studyType === 'new') {
    filtered = filtered.filter((uc) => uc.state === 0);
  } else {
    // review: Learning, Review, Relearning 상태이면서 due가 지난 카드
    filtered = filtered.filter((uc) => uc.state !== 0 && new Date(uc.due) <= new Date());
  }

  const content = filtered.map((uc) => {
    const word = mockWords.find((w) => w.id === uc.wordId);
    return {
      userCardId: uc.id,
      koreanCard: {
        cardId: word?.id ?? uc.wordId,
        koreanWord: word?.headword ?? '',
        homographNumber: word?.homographNumber ?? 0,
        level: word?.level ?? 'easy',
        topics: word?.topics ?? [],
      },
      studyInfo: {
        due: uc.due,
        stability: uc.stability,
        difficulty: uc.difficulty,
        scheduledDays: uc.scheduledDays,
        reps: uc.reps,
        lapses: uc.lapses,
        state: STATE_NAMES[uc.state],
        lastReview: uc.lastReview,
      },
    };
  });

  return NextResponse.json({
    size: content.length,
    pageSize: 100,
    page: 1,
    content,
  });
}
