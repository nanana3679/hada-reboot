-- RFC-0006: level과 topic을 categories로 통합
-- topics 컬럼을 categories로 리네이밍 (1회 실행 전용)
-- 롤백: 0001_down_rename_topics_to_categories.sql
ALTER TABLE words RENAME COLUMN topics TO categories;
