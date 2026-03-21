import { State } from 'ts-fsrs';

export interface MockUserCard {
  id: number;
  userId: number;
  wordId: number;
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}

export interface MockUserOption {
  userId: number;
  dailyReviewWords: number;
  dailyStudyWords: number;
  utcOffset: number;
  langCode: string;
}

export interface MockStudyHistory {
  userId: number;
  studyType: 'new' | 'review';
  category: string;
  studyDate: string;
}

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

export const mockUserCards: MockUserCard[] = [
  // New cards (아직 학습 안 함)
  { id: 1, userId: 1, wordId: 28943, due: now, stability: 0, difficulty: 0, scheduledDays: 0, reps: 0, lapses: 0, state: State.New, lastReview: null },
  { id: 2, userId: 1, wordId: 11798, due: now, stability: 0, difficulty: 0, scheduledDays: 0, reps: 0, lapses: 0, state: State.New, lastReview: null },
  { id: 3, userId: 1, wordId: 36440, due: now, stability: 0, difficulty: 0, scheduledDays: 0, reps: 0, lapses: 0, state: State.New, lastReview: null },
  { id: 4, userId: 1, wordId: 5775, due: now, stability: 0, difficulty: 0, scheduledDays: 0, reps: 0, lapses: 0, state: State.New, lastReview: null },

  // Learning cards (학습 중)
  { id: 5, userId: 1, wordId: 22094, due: now, stability: 1.5, difficulty: 5.5, scheduledDays: 0, reps: 1, lapses: 0, state: State.Learning, lastReview: yesterday },
  { id: 6, userId: 1, wordId: 40115, due: now, stability: 2.0, difficulty: 5.0, scheduledDays: 0, reps: 2, lapses: 0, state: State.Learning, lastReview: yesterday },

  // Review cards (복습 대기)
  { id: 7, userId: 1, wordId: 15714, due: yesterday, stability: 10.0, difficulty: 4.5, scheduledDays: 3, reps: 5, lapses: 0, state: State.Review, lastReview: twoDaysAgo },
  { id: 8, userId: 1, wordId: 9150, due: twoDaysAgo, stability: 8.0, difficulty: 5.2, scheduledDays: 2, reps: 3, lapses: 1, state: State.Review, lastReview: twoDaysAgo },
];

export const mockUserOption: MockUserOption = {
  userId: 1,
  dailyReviewWords: 20,
  dailyStudyWords: 10,
  utcOffset: 9,
  langCode: 'en',
};

export const mockStudyHistories: MockStudyHistory[] = [
  { userId: 1, studyType: 'new', category: 'easy', studyDate: yesterday },
  { userId: 1, studyType: 'review', category: 'easy', studyDate: yesterday },
  { userId: 1, studyType: 'new', category: 'economics_and_management', studyDate: twoDaysAgo },
];
