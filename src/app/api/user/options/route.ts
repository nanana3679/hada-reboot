import { NextRequest, NextResponse } from 'next/server';
import { mockUserOption } from '@/mocks/study';

// 메모리 내 상태 (mock용)
let currentOption = { ...mockUserOption };

// GET /api/user/options
export async function GET() {
  return NextResponse.json({
    dailyReviewWords: currentOption.dailyReviewWords,
    dailyStudyWords: currentOption.dailyStudyWords,
    utcOffset: currentOption.utcOffset,
    languageCode: currentOption.langCode,
  });
}

// POST /api/user/options
export async function POST(request: NextRequest) {
  const body = await request.json();

  currentOption = {
    ...currentOption,
    dailyReviewWords: body.dailyReviewWords ?? currentOption.dailyReviewWords,
    dailyStudyWords: body.dailyStudyWords ?? currentOption.dailyStudyWords,
    utcOffset: body.utcOffset ?? currentOption.utcOffset,
    langCode: body.languageCode ?? currentOption.langCode,
  };

  return NextResponse.json({
    dailyReviewWords: currentOption.dailyReviewWords,
    dailyStudyWords: currentOption.dailyStudyWords,
    utcOffset: currentOption.utcOffset,
    languageCode: currentOption.langCode,
  });
}
