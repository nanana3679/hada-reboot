CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  headword TEXT NOT NULL,
  homograph_number INTEGER NOT NULL DEFAULT 0,
  part_of_speech TEXT,
  is_native INTEGER,
  origin TEXT,
  pronunciation TEXT,
  frequency REAL,
  meaning_category TEXT,
  topics TEXT NOT NULL DEFAULT '[]',
  definition TEXT NOT NULL,
  examples TEXT NOT NULL DEFAULT '[]',
  conjugation TEXT,
  derivative TEXT
);

CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  lang_code TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT '[]',
  definition TEXT NOT NULL DEFAULT '[]'
);
CREATE UNIQUE INDEX IF NOT EXISTS translations_word_lang_idx ON translations(word_id, lang_code);

-- Auth.js 테이블 (실제 운영에서는 @auth/d1-adapter의 up() 함수로 생성)

CREATE TABLE IF NOT EXISTS "users" (
  "id" text NOT NULL DEFAULT '',
  "name" text DEFAULT NULL,
  "email" text DEFAULT NULL,
  "emailVerified" datetime DEFAULT NULL,
  "image" text DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" text NOT NULL,
  "userId" text NOT NULL DEFAULT NULL,
  "type" text NOT NULL DEFAULT NULL,
  "provider" text NOT NULL DEFAULT NULL,
  "providerAccountId" text NOT NULL DEFAULT NULL,
  "refresh_token" text DEFAULT NULL,
  "access_token" text DEFAULT NULL,
  "expires_at" number DEFAULT NULL,
  "token_type" text DEFAULT NULL,
  "scope" text DEFAULT NULL,
  "id_token" text DEFAULT NULL,
  "session_state" text DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" text NOT NULL DEFAULT NULL,
  "expires" datetime NOT NULL DEFAULT NULL,
  PRIMARY KEY (sessionToken)
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL DEFAULT NULL,
  "expires" datetime NOT NULL DEFAULT NULL,
  PRIMARY KEY (token)
);

-- 학습 데이터 테이블

CREATE TABLE IF NOT EXISTS user_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  due TEXT NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state INTEGER NOT NULL DEFAULT 0,
  last_review TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_cards_user_word_idx ON user_cards(user_id, word_id);
CREATE INDEX IF NOT EXISTS user_cards_user_due_idx ON user_cards(user_id, due);

CREATE TABLE IF NOT EXISTS user_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_review_words INTEGER NOT NULL DEFAULT 20,
  daily_study_words INTEGER NOT NULL DEFAULT 10,
  utc_offset INTEGER NOT NULL DEFAULT 0,
  lang_code TEXT NOT NULL DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS user_study_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_type TEXT NOT NULL CHECK(study_type IN ('new', 'review')),
  category TEXT NOT NULL,
  study_date TEXT NOT NULL
);
