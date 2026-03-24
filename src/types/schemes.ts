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

export interface WordDetail {
  wordId: number;
  word: string;
  homographNumber: number;
  categories: string[];
  meanings: Array<{
    foreignMeaning: string;
    partsOfSpeech: string;
    pronunciation: string;
    languageCode: Locale;
    originalLanguage: string;
    foreignWord: string;
    relatedWords: string;
    inflection: string;
    exampleUsage: string;
  }>;
}

export interface WordListItem {
  wordId: number;
  word: string;
  homographNumber: number;
  categories: string[];
  foreignWords: string[];
}

export type CardState = {
  [K in keyof FSRSCard as SnakeToCamelCase<K>]: FSRSCard[K];
} & {
  lastRating?: Date;
};

export interface CardDetail {
  /** WordDetail KV 캐싱 구현 후 WordDetail로 확장 예정 */
  word: {
    wordId: number;
    word: string;
    homographNumber: number;
    categories: string[];
  };
  state: CardState;
  userCardId: number;
}

export interface Deck {
  category: string;
  cardCounts: number;
  learningCounts: number;
  newCounts: number;
  overdueCounts: number;
  maturityCounts: number;
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

