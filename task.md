# Tasks

## refactor: Cloudflare Workers 백엔드 전환

- [x] `@cloudflare/next-on-pages` → `@opennextjs/cloudflare` 전환 완료
- [x] Next.js API Routes 추가 (`src/app/api/`) — mock API 8개 구현
- [x] Drizzle ORM 스키마 정의 (`src/db/schema.ts`)
- [x] Mock 데이터 작성 (`src/mocks/`)
- [x] D1 바인딩 설정 (`wrangler.jsonc`, `env.d.ts`)
- [x] CSV → D1 시딩 스크립트 작성
- [x] Mock API → D1 실제 쿼리로 전환
- [x] KV 캐싱 구현 (덱 집계) — RFC-0006 브랜치에서 완료
- [x] level → topics → categories 통합 반영 (RFC-0006)

## refactor: API 클라이언트 구조 변경 (RFC-0008)

- [x] `src/services/` 삭제 (이미 제거됨)
- [x] `src/api/*.ts` → Server Action에서 D1 직접 접근으로 전환 (이미 완료)
- [x] `src/app/api/` route.ts 삭제 — auth 제외, 나머지 이미 없음
- [x] mock 파일 삭제 (`src/api/*.mock.ts`, `src/utils/dummyData.ts`)
- [ ] FSRS 진입점 래퍼 작성 — ts-fsrs의 snake_case↔camelCase 변환을 래퍼에서 처리하여 `converter.ts` 제거

## refactor: 타입 개선

- [x] `src/types/schemes.ts` 새 API 응답 타입에 맞게 업데이트
- [ ] `src/utils/converter.ts` 삭제 (FSRS 래퍼 완성 후)

## feat: 인증

- [x] RFC-0005: Auth.js v5 + D1 Google OAuth 작성 (accepted)
- [x] Auth.js v5 + Google OAuth 설정 (`src/auth.ts`, route handler)
- [ ] D1 auth 테이블 마이그레이션 (users, accounts, sessions, verification_tokens)
- [ ] AUTH_SECRET, Google OAuth credentials wrangler secret 설정
- [ ] 로그인/로그아웃 UI 연동
- [ ] 보호 라우트 설정 (auth middleware 합성)

## docs: 문서화

- [x] `CLAUDE.md` 추가
- [x] RFC-0004: D1 + Drizzle 백엔드 재설계 작성
- [x] RFC-0005: Auth.js v5 + D1 Google OAuth 작성
- [x] RFC-0001 superseded 처리
- [x] `.gitignore`에 CSV 제외 추가

## chore: 기타

- [x] `filtered.csv` → `korean-words.csv` 이름 변경
- [x] `drizzle-orm` 의존성 추가
- [ ] `src/constants/options.ts` 배열에 `as const` 추가 — 타입 좁히기 대비
- [ ] `UTC_OFFSET_OPTIONS` 확장 — 현재 UTC+0~+4만 있음, 실제 사용자 범위 고려 필요
