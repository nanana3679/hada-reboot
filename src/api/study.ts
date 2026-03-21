'use server';

import { Paginated, StudyType, StudyInfo, StudyInfoDTO, UserCardDTO } from '@/types/schemes';
import { Category } from '@/types/Category';
import { toStudyInfo, toUserCard } from '@/utils/converter';
import { getDb } from '@/db';
import { words, userCards } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { invalidateUserDeckCache } from '@/lib/cache';

const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'] as const;

// TODO: auth 연동 후 실제 userId로 교체
const getUserId = (): number | null => null;

export const getLearningCards = async (studyType: StudyType, category: Category) => {
  const userId = getUserId();
  if (!userId) {
    return { size: 0, pageSize: 100, page: 1, content: [] };
  }
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

  const content: UserCardDTO[] = results.map((r) => ({
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
      state: (STATE_NAMES[r.state] ?? 'New') as StudyInfoDTO['state'],
      lastReview: r.lastReview,
    },
  }));

  const convertedData = content.map((card) => toUserCard(card));
  return { size: convertedData.length, pageSize: 100, page: 1, content: convertedData } as Paginated<ReturnType<typeof toUserCard>>;
};

export const postStudyInfo = async (userCardId: number, studyInfo: StudyInfo) => {
  const userId = getUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }
  const db = await getDb();

  const ownerCondition = and(eq(userCards.id, userCardId), eq(userCards.userId, userId));

  const card = await db.select().from(userCards).where(ownerCondition).get();
  if (!card) {
    throw new Error('UserCard not found');
  }

  const stateValue = (studyInfo.state >= 0 && studyInfo.state < STATE_NAMES.length)
    ? studyInfo.state
    : card.state;
  const now = new Date().toISOString();

  await db
    .update(userCards)
    .set({
      due: studyInfo.due.toISOString(),
      stability: studyInfo.stability,
      difficulty: studyInfo.difficulty,
      scheduledDays: studyInfo.scheduledDays,
      reps: studyInfo.reps,
      lapses: studyInfo.lapses,
      state: stateValue,
      lastReview: studyInfo.lastReview?.toISOString() ?? now,
      updatedAt: now,
    })
    .where(ownerCondition)
    .run();

  await invalidateUserDeckCache(userId);

  const updated = await db.select().from(userCards).where(ownerCondition).get();
  if (!updated) {
    throw new Error('Failed to retrieve updated card');
  }

  const dto: StudyInfoDTO = {
    due: updated.due,
    stability: updated.stability,
    difficulty: updated.difficulty,
    scheduledDays: updated.scheduledDays,
    reps: updated.reps,
    lapses: updated.lapses,
    state: STATE_NAMES[updated.state] ?? 'New',
    lastReview: updated.lastReview,
  };

  return toStudyInfo(dto);
};
