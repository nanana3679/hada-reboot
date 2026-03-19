import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { userOptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// TODO: auth 연동 후 실제 userId로 교체
const userId = 1;

// GET /api/user/options
export async function GET() {
  const db = await getDb();

  const option = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .get();

  if (!option) {
    return NextResponse.json({
      dailyReviewWords: 20,
      dailyStudyWords: 10,
      utcOffset: 0,
      languageCode: 'en',
    });
  }

  return NextResponse.json({
    dailyReviewWords: option.dailyReviewWords,
    dailyStudyWords: option.dailyStudyWords,
    utcOffset: option.utcOffset,
    languageCode: option.langCode,
  });
}

interface UserOptionBody {
  dailyReviewWords?: number;
  dailyStudyWords?: number;
  utcOffset?: number;
  languageCode?: string;
}

// POST /api/user/options
export async function POST(request: NextRequest) {
  const body = (await request.json()) as UserOptionBody;
  const db = await getDb();

  await db
    .insert(userOptions)
    .values({
      userId,
      dailyReviewWords: body.dailyReviewWords ?? 20,
      dailyStudyWords: body.dailyStudyWords ?? 10,
      utcOffset: body.utcOffset ?? 0,
      langCode: body.languageCode ?? 'en',
    })
    .onConflictDoUpdate({
      target: userOptions.userId,
      set: {
        dailyReviewWords: sql`coalesce(${body.dailyReviewWords ?? null}, ${userOptions.dailyReviewWords})`,
        dailyStudyWords: sql`coalesce(${body.dailyStudyWords ?? null}, ${userOptions.dailyStudyWords})`,
        utcOffset: sql`coalesce(${body.utcOffset ?? null}, ${userOptions.utcOffset})`,
        langCode: sql`coalesce(${body.languageCode ?? null}, ${userOptions.langCode})`,
      },
    })
    .run();

  const updated = await db
    .select()
    .from(userOptions)
    .where(eq(userOptions.userId, userId))
    .get();

  if (!updated) {
    return NextResponse.json({ error: 'Failed to retrieve updated options' }, { status: 500 });
  }

  return NextResponse.json({
    dailyReviewWords: updated.dailyReviewWords,
    dailyStudyWords: updated.dailyStudyWords,
    utcOffset: updated.utcOffset,
    languageCode: updated.langCode,
  });
}
