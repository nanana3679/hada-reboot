import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { userStudyHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';

// TODO: auth 연동 후 실제 userId로 교체
const userId = 1;

// GET /api/user/history
export async function GET() {
  const db = await getDb();

  const results = await db
    .select({
      deckType: userStudyHistory.deckType,
      studyType: userStudyHistory.studyType,
      deckName: userStudyHistory.deckName,
      studyDate: userStudyHistory.studyDate,
    })
    .from(userStudyHistory)
    .where(eq(userStudyHistory.userId, userId))
    .all();

  return NextResponse.json({
    size: results.length,
    pageSize: 100,
    page: 1,
    content: results,
  });
}
