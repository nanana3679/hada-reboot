# RFC-0001: Next.js API Routes + Cloudflare D1 기반 백엔드 설계

| 항목 | 내용 |
|------|------|
| **Status** | superseded |
| **Superseded by** | RFC-0004 |
| **Author** | Team |
| **Created** | 2026-03-19 |
| **Updated** | 2026-03-19 |

## Summary

기존 Spring Boot REST API 백엔드를 Next.js API Routes + Cloudflare D1으로 전환한다. 서버 사이드 인증(쿠키 + Axios 인터셉터)을 클라이언트 사이드 토큰(localStorage + fetch)으로 변경하고, 카드/번역 데이터를 JSON 컬럼으로 비정규화하여 조인을 최소화한다.

## Context

HADA는 외국인을 위한 한국어 단어 학습 앱이다. 기존 아키텍처는 다음과 같다:

- **백엔드**: Spring Boot REST API (별도 서버)
- **프론트엔드**: Next.js (Server Actions + `'use server'`)
- **인증**: 서버 사이드 쿠키 기반 (CookieService → AuthService → AuthInterceptor → Axios)
- **API 호출**: Axios HttpClient 래퍼 + 서버 사이드에서 호출

이 구조에서 발생하는 문제:

1. Spring Boot 서버 유지비용이 발생한다 (서버리스 목표와 충돌)
2. `'use server'` + 쿠키 기반 인증이 Cloudflare Pages(Edge Runtime)와 호환되지 않는다 (`next/headers`의 `cookies()`는 Edge에서 제한적)
3. Axios, humps 등 불필요한 의존성이 번들에 포함된다
4. mock 파일(`*.mock.ts`)과 실제 API 호출 코드가 분리되어 있어 관리가 번거롭다

## Decision

### 1. 인프라: Cloudflare D1 + Workers

Cloudflare D1(SQLite 기반)을 데이터베이스로 사용하고, Next.js API Routes를 Edge Runtime으로 실행한다.

```
Client (브라우저)
  ↓ fetch('/api/...')
Next.js API Routes (Edge Runtime)
  ↓ D1 바인딩
Cloudflare D1 (SQLite)
```

### 2. 인증: JWT + localStorage

서버 사이드 쿠키 인증을 폐기하고, 클라이언트 사이드 JWT 인증을 채택한다.

- 로그인 시 서버가 JWT를 발급하고 클라이언트가 `localStorage`에 저장한다
- 모든 API 요청에 `Authorization: Bearer <token>` 헤더를 포함한다
- 토큰 검증은 `jose` 라이브러리로 Edge Runtime에서 수행한다
- 패스워드 해싱은 Web Crypto API(PBKDF2)를 사용한다 (bcrypt는 Workers에서 사용 불가)

### 3. API 엔드포인트 설계

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/login` | 이메일/패스워드 로그인 | - |
| POST | `/api/auth/register` | 회원가입 | - |
| GET | `/api/cards/[id]` | 카드 상세 (학습 상태 포함) | O |
| GET | `/api/deck/today` | 오늘의 학습 카드 (overdue + 신규) | O |
| GET | `/api/decks` | 덱 목록 (난이도/주제별 그룹) | O |
| GET | `/api/decks/cards` | 덱 내 카드 목록 | O |
| POST | `/api/review` | 학습 결과 저장 (FSRS 상태 UPSERT) | O |
| GET | `/api/stats/daily` | 일별 학습 통계 (기간 필터) | O |
| GET | `/api/stats/streak` | 연속 학습일 + 최장 기록 | O |
| GET | `/api/stats/cards/[id]` | 특정 카드의 학습 이력 | O |
| GET | `/api/settings` | 사용자 설정 조회 | O |
| PATCH | `/api/settings` | 사용자 설정 변경 | O |

### 4. DB 스키마 (비정규화)

4개 테이블로 구성한다:

- **users**: 사용자 정보 + 학습 설정 (`daily_new_cards`, `day_start_hour`)
- **cards**: 단어 데이터. 번역을 JSON 컬럼(`translations`)으로 저장하여 언어별 조인을 제거
- **card_states**: FSRS 학습 상태. `(user_id, card_id)` 복합 PK. UPSERT로 갱신
- **review_logs**: 개별 학습 응답 기록. 통계 산출의 원본 데이터

```sql
-- 번역 데이터 예시
translations: '{"en": "apple", "ja": "りんご", "zh": "苹果"}'

-- 학습 응답 로그
CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,        -- 1: Again, 2: Hard, 3: Good, 4: Easy
  reviewed_at TEXT NOT NULL,
  elapsed_ms INTEGER,             -- 응답까지 걸린 시간 (ms)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_date
  ON review_logs(user_id, reviewed_at);
```

`review_logs`는 `/api/review` POST 시 `card_states` UPSERT와 함께 INSERT한다. 별도 API 호출 없이 학습할 때마다 자동 축적되며, 통계 API는 이 테이블을 집계하여 반환한다.

이 테이블을 추가하는 이유:
- **학습 패턴 분석** — 날짜/시간대별 학습량, Rating 분포를 파악하여 사용자에게 피드백을 줄 수 있다
- **연속 학습(스트릭)** — 동기 부여를 위한 핵심 기능이나, `card_states`만으로는 "언제 학습했는지" 이력을 추적할 수 없다. `card_states`는 최신 상태만 보존하므로 과거 행동이 덮어쓰여진다
- **응답 시간 추적** — 어떤 카드에서 오래 고민했는지 알 수 있어, 난이도 자동 조정이나 취약 카드 식별에 활용할 수 있다
- **FSRS 디버깅** — Rating 이력이 있으면 FSRS 파라미터 튜닝이나 스케줄링 문제 분석이 가능하다

### 5. 클라이언트 API 호출 구조

기존 5개 서비스 클래스(AuthInterceptor, AuthService, CookieService, HttpClient, ServerServiceFactory)를 `src/lib/api-client.ts` 하나로 통합한다.

- `getToken()` / `setToken()` / `removeToken()` — localStorage 토큰 관리
- `request<T>(path, options)` — 공통 fetch 래퍼 (401 시 자동 로그아웃)
- 도메인별 함수: `login()`, `register()`, `getTodayDeck()`, `postReview()` 등

### 6. 학습 카드 순서: 결정적 셔플

`/api/deck/today`는 오늘의 학습 카드를 반환할 때 `deterministicShuffle(cards, userId + today)` 를 적용한다.

- 같은 날, 같은 유저에게 항상 같은 순서를 보장한다
- 새로고침해도 진행 상태가 유지된다
- 학습량을 줄이면 앞에서부터 잘라내면 되므로 진행률이 보존된다

### 7. 삭제 대상

| 파일 | 이유 |
|------|------|
| `src/services/*` (5개) | api-client.ts로 대체 |
| `src/api/*.mock.ts` (4개) | D1 직접 연결로 mock 불필요 |
| `src/api/auth.ts` | api-client.ts로 대체 |
| `src/utils/converter.ts` | `CamelCaseKeys` 유틸 타입 + API 응답 직접 camelCase로 대체 |
| `axios`, `humps` | 의존성 제거 |

## Alternatives Considered

### Spring Boot API 유지 + Cloudflare Pages에서 호출

Spring Boot 서버를 그대로 두고 프론트엔드만 Cloudflare Pages로 배포하는 방식. 기존 코드를 거의 수정하지 않아도 된다. 그러나 서버 유지비용이 발생하고, 프로젝트의 서버리스 전환 목표와 맞지 않는다.

### Cloudflare Workers 별도 분리 (프론트엔드 / API 분리 배포)

API를 별도 Workers 프로젝트로 분리하면 독립 배포와 스케일링이 가능하다. 그러나 1인 프로젝트에서 별도 레포와 배포 파이프라인을 관리하는 것은 과도한 복잡도다. Next.js API Routes로 통합하면 하나의 `wrangler.toml`로 관리할 수 있다.

### Supabase / PlanetScale 등 외부 DB

관리형 DB를 사용하면 D1보다 성숙한 도구와 대시보드를 활용할 수 있다. 그러나 Cloudflare Edge에서 외부 DB로의 네트워크 레이턴시가 추가되고, D1은 Cloudflare 인프라에 통합되어 바인딩만으로 접근 가능하여 설정이 단순하다.

## Consequences

### Positive

- Spring Boot 서버 제거로 인프라 비용이 0에 수렴한다 (Cloudflare 무료 티어 범위)
- Edge Runtime 실행으로 글로벌 저지연 응답이 가능하다
- Axios, humps 등 의존성 제거로 번들 크기가 감소한다
- API Route와 프론트엔드가 같은 프로젝트에 있어 타입을 공유할 수 있다
- 서비스 클래스 5개 → 파일 1개로 코드가 단순해진다

### Negative

- localStorage 기반 토큰은 XSS에 취약하다. 향후 HttpOnly 쿠키로 전환을 고려해야 한다
- D1은 아직 GA 초기 단계로, 대규모 트래픽에서의 안정성이 검증되지 않았다
- `@opennextjs/cloudflare`의 `getCloudflareContext()` API에 대한 런타임 의존이 발생한다
- 비정규화 스키마(JSON 컬럼)는 특정 번역 언어만 검색하는 쿼리가 비효율적이다

### Neutral

- 인증 방식이 서버 사이드(쿠키)에서 클라이언트 사이드(JWT)로 변경된다. SSR 페이지에서 인증 상태를 확인할 수 없으므로, 인증이 필요한 UI는 클라이언트에서 처리해야 한다
- Google OAuth 로그인이 이메일/패스워드 로그인으로 변경된다. OAuth 재도입 시 별도 작업이 필요하다

## References

- [Cloudflare D1 문서](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)
- [ts-fsrs 라이브러리](https://github.com/open-spaced-repetition/ts-fsrs)
- 기존 HADA 프로젝트: https://github.com/donghyoya/HADA
