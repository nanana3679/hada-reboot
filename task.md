# Tasks

## refactor: Cloudflare Workers 백엔드 전환

- [x] `@cloudflare/next-on-pages` → `@opennextjs/cloudflare` 전환 완료
- [x] Next.js API Routes 추가 (`src/app/api/`) — mock API 8개 구현
- [x] Drizzle ORM 스키마 정의 (`src/db/schema.ts`)
- [x] Mock 데이터 작성 (`src/mocks/`)
- [x] D1 바인딩 설정 (`wrangler.jsonc`, `env.d.ts`)
- [ ] CSV → D1 시딩 스크립트 작성
- [ ] Mock API → D1 실제 쿼리로 전환
- [ ] KV 캐싱 구현 (덱 집계)
- [ ] level → topics 통합 반영 (스키마, mock, API)

## refactor: API 클라이언트 구조 변경

- [ ] `src/services/` 삭제 (AuthInterceptor, AuthService, CookieService, HttpClient, ServerServiceFactory)
- [ ] `src/api/*.ts` → 새 API Routes 호출로 전환
- [ ] mock 파일 삭제 (`src/api/*.mock.ts`)

## refactor: 타입 개선

- [ ] `src/types/schemes.ts` 새 API 응답 타입에 맞게 업데이트
- [ ] `src/utils/converter.ts` 삭제 (API 응답 형식 통일로 불필요)

## docs: 문서화

- [x] `CLAUDE.md` 추가
- [x] RFC-0004: D1 + Drizzle 백엔드 재설계 작성
- [x] RFC-0001 superseded 처리
- [x] `.gitignore`에 CSV 제외 추가

## chore: 기타

- [x] `filtered.csv` → `korean-words.csv` 이름 변경
- [x] `drizzle-orm` 의존성 추가
