-- RFC-0006: level과 topic을 categories로 통합
-- topics 컬럼을 categories로 리네이밍
ALTER TABLE words RENAME COLUMN topics TO categories;
