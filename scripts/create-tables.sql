CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  headword TEXT NOT NULL,
  homograph_number INTEGER NOT NULL DEFAULT 0,
  part_of_speech TEXT,
  is_native INTEGER,
  origin TEXT,
  pronunciation TEXT,
  level TEXT NOT NULL CHECK(level IN ('easy', 'normal', 'hard')),
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

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_review_words INTEGER NOT NULL DEFAULT 20,
  daily_study_words INTEGER NOT NULL DEFAULT 10,
  utc_offset INTEGER NOT NULL DEFAULT 0,
  lang_code TEXT NOT NULL DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS user_study_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_type TEXT NOT NULL CHECK(deck_type IN ('level', 'topic')),
  study_type TEXT NOT NULL CHECK(study_type IN ('new', 'review')),
  deck_name TEXT NOT NULL,
  study_date TEXT NOT NULL
);
