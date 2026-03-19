# Tasks

## refactor: Cloudflare Workers 백엔드 전환

- [ ] `@cloudflare/next-on-pages` → `@opennextjs/cloudflare` import 변경 (`src/lib/auth.ts`, `src/lib/db.ts`)
- [ ] Next.js API Routes 추가 (`src/app/api/`)
- [ ] `wrangler.toml`, `env.d.ts` 설정 추가
- [ ] `next.config.mjs` 업데이트

## refactor: API 클라이언트 구조 변경

- [ ] `src/services/` 삭제 (AuthInterceptor, AuthService, CookieService, HttpClient, ServerServiceFactory)
- [ ] `src/lib/api-client.ts` 로 통합
- [ ] `src/api/*.ts` API 호출 코드 리팩토링
- [ ] mock 파일 삭제 (`src/api/*.mock.ts`)

## refactor: 타입 개선

- [ ] `CamelCaseKeys` 재귀 유틸 타입 추가 (`src/types/typeTransform.ts`)
- [ ] `src/types/fsrs.ts` 수동 정의 → `CamelCaseKeys` 활용으로 변경
- [ ] `src/types/schemes.ts` `StudyInfo` 타입 `CamelCaseKeys` 적용
- [ ] `src/utils/converter.ts` 삭제
- [ ] `src/utils/FSRS.ts` 주석 수정

## chore: 기타

- [ ] `CLAUDE.md` 추가
- [ ] `schema.sql` 추가
