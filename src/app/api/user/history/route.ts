import { NextResponse } from 'next/server';
import { mockStudyHistories } from '@/mocks/study';

// GET /api/user/history
export async function GET() {
  const content = mockStudyHistories.map((h) => ({
    deckType: h.deckType,
    studyType: h.studyType,
    deckName: h.deckName,
    studyDate: h.studyDate,
  }));

  return NextResponse.json({
    size: content.length,
    pageSize: 100,
    page: 1,
    content,
  });
}

// GET /api/user/history/latest → 같은 라우트에서 query param으로 처리
// 별도 라우트가 필요하면 추가 가능
