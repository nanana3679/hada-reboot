import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ─── 단어 ───

export const words = sqliteTable('words', {
  id: integer('id').primaryKey(),
  headword: text('headword').notNull(),
  homographNumber: integer('homograph_number').notNull().default(0),
  partOfSpeech: text('part_of_speech'),
  isNative: integer('is_native', { mode: 'boolean' }),
  origin: text('origin'),
  pronunciation: text('pronunciation'),
  frequency: real('frequency'),
  meaningCategory: text('meaning_category'),
  topics: text('topics', { mode: 'json' }).$type<string[]>().notNull().default([]),
  definition: text('definition', { mode: 'json' }).$type<string[]>().notNull(),
  examples: text('examples', { mode: 'json' }).$type<string[]>().notNull().default([]),
  conjugation: text('conjugation'),
  derivative: text('derivative'),
});

// ─── 번역 ───

export const translations = sqliteTable(
  'translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    langCode: text('lang_code').notNull(),
    translation: text('translation', { mode: 'json' }).$type<string[]>().notNull().default([]),
    definition: text('definition', { mode: 'json' }).$type<string[]>().notNull().default([]),
  },
  (table) => [uniqueIndex('translations_word_lang_idx').on(table.wordId, table.langCode)]
);

// ─── Auth.js 테이블 (실제 생성은 @auth/d1-adapter의 up() 함수가 담당) ───

export const users = sqliteTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email'),
  emailVerified: integer('emailVerified', { mode: 'timestamp' }),
  image: text('image'),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').notNull(),
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

export const verificationTokens = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().primaryKey(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

// ─── 학습 카드 (FSRS 상태) ───

export const userCards = sqliteTable(
  'user_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    due: text('due').notNull(),
    stability: real('stability').notNull().default(0),
    difficulty: real('difficulty').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    state: integer('state').notNull().default(0), // 0=New, 1=Learning, 2=Review, 3=Relearning
    lastReview: text('last_review'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('user_cards_user_word_idx').on(table.userId, table.wordId)]
);

// ─── 사용자 설정 ───

export const userOptions = sqliteTable('user_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  dailyReviewWords: integer('daily_review_words').notNull().default(20),
  dailyStudyWords: integer('daily_study_words').notNull().default(10),
  utcOffset: integer('utc_offset').notNull().default(0),
  langCode: text('lang_code').notNull().default('en'),
});

// ─── 학습 이력 ───

export const userStudyHistory = sqliteTable('user_study_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  studyType: text('study_type', { enum: ['new', 'review'] }).notNull(),
  category: text('category').notNull(),
  studyDate: text('study_date').notNull(),
});
