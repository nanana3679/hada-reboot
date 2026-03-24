-- RFC-0006 롤백: categories 컬럼을 topics로 되돌림
ALTER TABLE words RENAME COLUMN categories TO topics;
