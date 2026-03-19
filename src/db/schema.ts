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
  level: text('level', { enum: ['easy', 'normal', 'hard'] }).notNull(),
  frequency: real('frequency'),
  meaningCategory: text('meaning_category'),
  topics: text('topics', { mode: 'json' }).$type<string[]>().notNull().default([]),
  definition: text('definition').notNull(),
  examples: text('examples'),
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
    translation: text('translation'),
    definition: text('definition'),
  },
  (table) => [uniqueIndex('translations_word_lang_idx').on(table.wordId, table.langCode)]
);

// ─── 사용자 ───

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  externalId: text('external_id').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

// ─── 학습 카드 (FSRS 상태) ───

export const userCards = sqliteTable(
  'user_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
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
  userId: integer('user_id')
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
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deckType: text('deck_type', { enum: ['level', 'topic'] }).notNull(),
  studyType: text('study_type', { enum: ['new', 'review'] }).notNull(),
  deckName: text('deck_name').notNull(),
  studyDate: text('study_date').notNull(),
});
