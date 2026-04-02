import { Locale } from './Locale';
import { SnakeToCamelCase } from './typeTransform';
import { Card as FSRSCard } from 'ts-fsrs';

export type StudyType = 'review' | 'new';

export type Paginated<T> = {
  size: number;
  pageSize: number;
  page: number;
  content: T[];
};

/** words + translations 조인. 동형어(headword + homographNumber) 단위. */
export interface Word {
  wordId: number;
  headword: string;
  homographNumber: number;
  partOfSpeech: string | null;
  isNative: boolean | null;
  origin: string | null;
  pronunciation: string | null;
  frequency: number | null;
  categories: string[];
  examples: string[];
  conjugation: string | null;
  derivative: string | null;
  translation: string;
  definition: string;
}

/** 덱 목록용 요약. 동형어 단위. */
export interface WordListItem {
  wordId: number;
  headword: string;
  homographNumber: number;
  categories: string[];
  translation: string;
  studyState: number | null; // null=new, 0=new, 1=learning, 2=review, 3=relearning
}

export type CardState = {
  [K in keyof FSRSCard as SnakeToCamelCase<K>]: FSRSCard[K];
} & {
  lastRating?: Date;
};

export interface CardDetail {
  word: Word;
  fsrs: CardState;
  userCardId: number | null;
}

export interface Deck {
  category: string;
  cardCounts: number;
  learningCounts: number;
  newCounts: number;
  overdueCounts: number;
  reviewedCounts: number;
}

export interface UserStudyHistory {
  studyType: StudyType;
  category: string;
  studyDate: string;
}

export type UserOption = {
  dailyReviewWords: number;
  dailyStudyWords: number;
  utcOffset: number;
  languageCode: Locale;
};

