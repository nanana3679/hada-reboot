# RFC-0004: D1 + Drizzle 기반 백엔드 재설계

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | Team |
| **Created** | 2026-03-19 |
| **Updated** | 2026-03-19 |
| **Supersedes** | RFC-0001 |

## Summary

Spring Boot 백엔드 의존을 제거하고, Cloudflare D1(SQLite) + Drizzle ORM으로 전환한다. 데이터 모델을 재설계하고, Next.js API Routes를 통해 REST API를 제공하며, 변경이 적은 집계 데이터는 Cloudflare KV로 캐싱한다.

## Context

현재 HADA는 Next.js 프론트엔드가 외부 Spring Boot 서버의 REST API를 호출하는 구조다.

- Next.js는 Cloudflare Workers에 배포되어 있지만, Spring Boot 서버는 별도 인프라에서 운영해야 한다
- 단어 데이터(58,102건)는 CSV 파일로 이미 확보되어 있어 외부 서버에서 제공받을 필요가 없다
- Spring Boot 서버는 단어 조회, FSRS 학습 상태 저장, 사용자 설정 관리만 담당하며, 이 기능들은 Cloudflare Workers 환경에서 충분히 처리할 수 있다
- 두 서버를 운영하면 배포·모니터링·비용이 이중으로 발생한다

Cloudflare Workers 환경에서 사용 가능한 DB는 D1(SQLite 기반)이며, Workers 전용 KV Store도 활용할 수 있다.

## Decision

### 1. DB: Cloudflare D1 + ORM: Drizzle

Cloudflare D1을 데이터베이스로, Drizzle ORM을 쿼리 빌더로 사용한다.

- D1은 Cloudflare Workers에 네이티브로 바인딩되어 네트워크 지연이 없다
- Drizzle은 SQL에 가까운 타입 안전 쿼리를 제공하며, D1 어댑터를 공식 지원한다
- 번들 크기가 작아(~50KB) Workers의 크기 제한에 적합하다

### 2. 테이블 설계

**words** — 단어 테이블. CSV의 각 행(표제어 + 동형어 번호 조합)이 하나의 레코드.

- `topics`를 JSON 배열로 저장한다 (`["EASY", "ECONOMY", "NUMBER"]`)
- **level을 별도 컬럼으로 두지 않고 topics에 통합한다.** 초급→`EASY`, 중급→`NORMAL`, 고급→`HARD`로 변환하여 topics 배열에 포함시킨다
- 이유: 덱 조회 시 level/topic 분기 로직이 사라지고, 하나의 쿼리 패턴으로 통일된다
- topics는 고정된 30개 값(기존 27개 주제 + 3개 레벨)이므로 별도 정규화 테이블의 이점이 적다

**translations** — 언어별 번역. `word_id + lang_code` unique.

- words에 11개 언어 × 2개 컬럼(번역어+뜻풀이)을 넣으면 22개 컬럼이 추가되므로 분리한다
- 특정 언어만 조회할 수 있고, 새 언어 추가가 INSERT만으로 가능하다

**users** — 최소 사용자 테이블. `id`, `external_id`, `created_at`.

- 현재 인증은 기존 JWT를 유지하되, JWT의 사용자 식별값을 `external_id`에 저장한다
- 내부적으로는 auto-increment `id`를 FK로 사용하여, 인증 제공자가 변경되어도 `external_id`만 업데이트하면 된다

**user_cards** — FSRS 학습 상태. `user_id + word_id` unique.

- FSRS 필드(due, stability, difficulty, scheduled_days, reps, lapses, state, last_review)를 직접 저장한다
- 학습 상태는 user_card와 항상 1:1 관계이므로 별도 테이블로 분리하지 않는다

**user_options** — 사용자 설정. **user_study_history** — 학습 이력.

**Deck 테이블은 만들지 않는다.** 덱은 words 테이블의 topics를 기준으로 집계한 뷰이며, 별도 테이블로 관리하면 동기화 문제가 발생한다.

### 3. 덱 집계 캐싱: Cloudflare KV

덱 목록(카테고리별 단어 수, 학습 상태 카운트)은 자주 조회되지만 거의 바뀌지 않는다.

- 단어 데이터 자체(카테고리별 총 단어 수)는 고정이므로 글로벌 캐싱한다
- 사용자별 학습 카운트는 유저별 키로 KV에 캐싱하고, 학습 결과 저장 시 해당 캐시를 무효화한다
- D1에 58,000건 집계 쿼리를 매 요청마다 실행하는 것을 방지한다

### 4. API 재설계: 리소스 중심 URL

Spring Boot API의 `queryType`+`query` 조합 패턴을 제거하고, 리소스 중심으로 재설계한다.

| 엔드포인트 | 메서드 | 역할 |
|-----------|--------|------|
| `/api/decks?type=level\|topic` | GET | 덱 목록 (집계) |
| `/api/decks/cards?category=&lang=&page=` | GET | 덱 내 카드 목록 |
| `/api/words/search?q=&lang=&type=korean\|foreign` | GET | 단어 검색 |
| `/api/words/[id]?lang=` | GET | 단어 상세 |
| `/api/study/cards?studyType=new\|review&category=` | GET | 학습 카드 조회 |
| `/api/study/[userCardId]` | POST | 학습 결과 저장 |
| `/api/user/options` | GET/POST | 사용자 설정 |
| `/api/user/history` | GET | 학습 이력 |

- `category`에 `EASY`를 넣으면 레벨 필터, `ECONOMY`를 넣으면 주제 필터 — level과 topic이 통합되었으므로 서버에서 분기할 필요 없이 동일한 topics 필터로 처리한다
- 검색은 `korean-search`/`foreign-search` 두 엔드포인트 대신 `/words/search?type=`으로 통합한다

### 5. CSV 변환

`filtered.csv`를 D1 시딩 시 다음과 같이 변환한다:

- `어휘 등급` 컬럼(초급/중급/고급)을 `EASY`/`NORMAL`/`HARD`로 변환하여 topics에 포함
- `groups` 컬럼의 한국어 주제명을 영문 enum으로 매핑
- 부표제어(sub-entry) 데이터는 사용하지 않으므로 제외

## Alternatives Considered

### Spring Boot 서버 유지 + Next.js는 프론트엔드만

현재 구조를 유지하는 방법. Spring Boot가 안정적이고 이미 동작 중이다. 그러나 두 서버를 별도 운영해야 하며, Cloudflare Workers와 Spring Boot 간 네트워크 지연이 발생한다. 단어 데이터가 이미 CSV로 확보되어 있으므로 Spring Boot의 역할이 크지 않다.

### Prisma + D1

Prisma도 D1을 지원한다. 그러나 Prisma Client의 번들 크기가 크고(~400KB+), edge runtime에서의 콜드 스타트가 Drizzle 대비 느리다. Cloudflare Workers의 번들 크기 제한(10MB)과 콜드 스타트 민감성을 고려하면 Drizzle이 적합하다.

### topics 정규화 (word_topics 중간 테이블)

`word_topics(word_id, topic)` 테이블을 만들면 인덱스 기반 주제 필터가 가능하다. 그러나 단어 조회 시 항상 JOIN이 필요하고, 30개 고정 값에 대해 별도 테이블을 유지하는 것은 과도한 정규화다. JSON 배열 + KV 캐싱으로 충분히 대응 가능하다.

### level을 별도 컬럼으로 유지

level과 topic을 분리하면 스키마가 직관적이다. 그러나 덱 조회 API에서 level/topic 분기 로직이 필요하고, 프론트엔드에서도 `CategoryType`을 구분하는 코드가 유지되어야 한다. 통합하면 "카테고리로 필터"라는 하나의 패턴으로 단순화된다.

## Consequences

### Positive

- Spring Boot 서버 운영 비용과 복잡성이 제거된다
- 프론트엔드와 백엔드가 같은 Cloudflare 환경에서 동작하여 네트워크 지연이 사라진다
- level/topic 통합으로 덱 관련 코드의 분기 로직이 단순해진다
- Drizzle의 타입 안전 쿼리로 런타임 타입 에러가 줄어든다
- D1의 무료 티어(5GB, 5M rows read/day)로 현재 규모에서 비용이 발생하지 않는다

### Negative

- D1은 아직 GA(General Availability) 단계이지만, SQLite 기반이라 복잡한 쿼리(window function 등)에 제약이 있을 수 있다
- topics를 JSON 배열로 저장하면 DB 레벨 인덱스가 불가능하여, KV 캐싱에 의존하게 된다
- 기존 Spring Boot API와 호환되지 않으므로, 프론트엔드의 `src/api/*.ts`와 `src/services/` 전체를 리팩토링해야 한다
- level을 topics에 통합하면, "이 단어의 레벨이 뭔가?"를 알려면 topics 배열에서 EASY/NORMAL/HARD를 찾아야 한다

### Neutral

- 인증 방식은 현재 JWT를 그대로 유지한다. 추후 자체 인증으로 전환할 때 `users.external_id` 매핑만 변경하면 된다
- CSV 원본 파일은 프로젝트에 유지하여, 필요 시 재시딩할 수 있도록 한다

## References

- [Cloudflare D1 문서](https://developers.cloudflare.com/d1/)
- [Drizzle ORM D1 가이드](https://orm.drizzle.team/docs/get-started/d1-new)
- [Cloudflare KV 문서](https://developers.cloudflare.com/kv/)
- [ts-fsrs 라이브러리](https://github.com/open-spaced-repetition/ts-fsrs)
- `src/db/schema.ts` — Drizzle 스키마 정의
- `src/app/api/` — Mock API 구현
