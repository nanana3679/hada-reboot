# RFC-0009: Server Action API 설계 및 타입/스키마 정합성 정리

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | Team |
| **Created** | 2026-03-23 |
| **Updated** | 2026-03-24 |

## Summary

Server Action 기반 API의 입출력 타입, 응답 구조, 인증 패턴, 캐시 키 규칙을 설계한다. 이전 REST API에서 가져온 레거시 타입과 변환 유틸을 제거하고, Auth.js DB 스키마 정합성도 함께 수정한다.

## Context

Spring Boot REST API에서 Next.js Server Action + D1 직접 쿼리로 전환하는 과정에서 설계 없이 구현을 먼저 진행했다. 그 결과 다음 문제들이 발생했다:

### 1. 중복 코드

`getUserId()` 함수가 `decks.ts`, `option.ts`, `study.ts` 3곳에 동일하게 정의되어 있다.

```ts
// decks.ts, option.ts, study.ts 모두 동일
async function getUserId(): Promise<string | null> {
  const { auth } = await getAuth();
  const session = await auth();
  return session?.user?.id ?? null;
}
```

### 2. 레거시 응답 구조

`Paginated<T>` 래퍼는 REST API 시절 페이지네이션을 위해 만든 타입인데, pagination이 필요 없는 응답에도 사용되고 있다:

```ts
// getUserStudyHistories: 전체 결과를 반환하면서 하드코딩된 pagination 메타
return { size: results.length, pageSize: 100, page: 1, content: results };
```

실제로 pagination이 필요한 함수는 `getCardsFromDeck`과 `searchWords` 뿐이다.

### 3. 레거시 타입과 변환 유틸

이전 REST API의 snake_case 응답을 camelCase로 변환하기 위해 만든 구조가 남아있다:

- `StudyInfoDTO` — REST API 응답 형식 (state가 문자열, due가 ISO string)
- `UserCardDTO` — DTO를 포함하는 래퍼
- `toStudyInfo()`, `toUserCard()` — DTO → 도메인 객체 변환 유틸 (`src/utils/converter.ts`)
- `TokenDTO` — 이전 JWT 인증 시절 타입 (현재 미사용)
- `SnakeToCamelCase` — snake_case 변환용 유틸리티 타입 (현재 미사용)

Server Action에서는 직접 도메인 타입을 반환할 수 있으므로 DTO 레이어가 불필요하다.

### 4. 동일 역할 함수 중복

`cards.ts`의 `getKoreanCardDetail`과 `words.ts`의 `getWordDetail`이 같은 역할(단어 상세 조회)인데 반환 구조가 다르다:
- `getKoreanCardDetail` → `KoreanCardDetail` (meanings가 배열, 첫 번째 요소만 사용)
- `getWordDetail` → 자체 타입 (meanings가 단일 객체, homographs 포함)

### 5. null 처리 불일치

`option.ts`의 `postUserOption`에서 INSERT와 UPDATE의 null 의미가 다르다:
- INSERT: 필드가 null이면 NULL 삽입
- UPDATE: `coalesce`로 기존 값 유지

`UserOption`의 모든 필드는 필수이므로 `coalesce`가 불필요하다.

### 6. 캐시 키 검증 부재

`userDeckKey(userId: string)`에 빈 문자열이 들어오면 `decks:user:`라는 무의미한 키가 생성된다.

### 7. Auth.js DB 스키마 정합성

`scripts/create-tables.sql`과 `src/db/schema.ts`에 Auth.js 공식 스키마와의 불일치가 있다:

- SQL: `NOT NULL DEFAULT NULL` 모순, `expires_at number` (유효하지 않은 SQLite 타입)
- Drizzle: `accounts`에 `(provider, providerAccountId)` 유니크 제약 누락
- Drizzle: `verificationTokens`에 `(identifier, token)` 복합 PK 누락

## Decision

### A. 인증 유틸 통합

`getUserId()`를 `src/api/auth-actions.ts`에 한 곳에서 export한다:

```ts
// src/api/auth-actions.ts
export async function getUserId(): Promise<string | null> {
  const { auth } = await getAuth();
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}
```

- 인증 선택적인 함수 → `getUserId()` (null 반환)
- 인증 필수인 함수 → `requireUserId()` (throw)

| 함수 | 인증 | 사용할 유틸 |
|------|:---:|------|
| `getDecks` | 선택 | `getUserId()` |
| `getUserStudyHistories` | 선택 | `getUserId()` |
| `getUserOption` | 선택 | `getUserId()` |
| `getCardsFromDeck` | 불필요 | — |
| `searchWords` | 불필요 | — |
| `getWordDetail` | 불필요 | — |
| `postUserOption` | 필수 | `requireUserId()` |
| `postStudyInfo` | 필수 | `requireUserId()` |
| `getLearningCards` | 필수 | `requireUserId()` |

### B. 응답 구조 정리

`Paginated<T>`는 실제 pagination이 있는 함수에서만 사용한다:

| 함수 | pagination 필요 | 응답 타입 |
|------|:---:|------|
| `getCardsFromDeck` | O | `Paginated<T>` |
| `searchWords` | O | `Paginated<T>` |
| `getDecks` | X | `Deck[]` |
| `getUserStudyHistories` | X | `UserStudyHistory[]` |
| `getLearningCards` | X | `UserCard[]` |
| `getUserOption` | X | `UserOption` |

### C. 레거시 타입/유틸 제거

다음을 삭제한다:

| 대상 | 파일 | 사유 |
|------|------|------|
| `StudyInfo` | `src/types/schemes.ts` | `CardState`로 리네이밍 (RFC-0006). ts-fsrs `Card`의 camelCase 래퍼로 유지 |
| `StudyInfoDTO` | `src/types/schemes.ts` | `CardStateDTO`로 리네이밍. Server Action 직접 반환으로 전환 후 불필요하면 삭제 |
| `UserCardDTO` | `src/types/schemes.ts` | `CardDetailDTO`로 리네이밍. 동일하게 불필요하면 삭제 |
| `TokenDTO` | `src/types/schemes.ts` | JWT 인증 제거로 미사용 |
| `SnakeToCamelCase` | `src/types/typeTransform.ts` | REST 변환용, 미사용 |
| `toStudyInfo()` | `src/utils/converter.ts` | CardState 직접 매핑으로 불필요 |
| `toUserCard()` | `src/utils/converter.ts` | CardDetail 직접 매핑으로 불필요 |
| `toStudyInfoDTO()` | `src/utils/converter.ts` | CardStateDTO 리네이밍 후 불필요하면 삭제 |
| `toKoreanCardDetail()` | `src/utils/converter.ts` | 더미 데이터 기반, 불필요 |
| `STATE_MAP` | `src/constants/study.ts` | DTO state 문자열 변환용, 불필요 |
| `STATE_MAP_REVERSE` | `src/constants/study.ts` | 동일 |
| `DUMMY_KOR_CARD_DETAIL` | `src/utils/dummyData.ts` | `toKoreanCardDetail` 제거로 미사용 |
| `DUMMY_STUDY_INFO_DTO` | `src/utils/dummyData.ts` | DTO 리네이밍/제거로 미사용 |

**StudyInfo → CardState 전략 (RFC-0006 참조):**

`StudyInfo`는 `CardState`로 리네이밍한다. `CardState`는 ts-fsrs `Card`의 camelCase 래퍼 타입으로, `schemes.ts`에서 정의한다. 다른 파일은 `import { CardState } from '@/types/schemes'`로 사용하며, ts-fsrs `Card`를 직접 import하지 않는다.

`SnakeToCamelCase` 유틸리티 타입은 ts-fsrs v4의 `Card` 타입이 이미 camelCase이므로 삭제한다. `CardState`는 `FSRSCard` 타입을 그대로 re-export하는 형태가 된다.

`study.ts`의 `getLearningCards`와 `postStudyInfo`는 DB 조회 결과를 `CardState` 타입으로 매핑한다. state는 DB에 숫자(0~3)로 저장되어 있고 ts-fsrs `State` enum도 숫자이므로, `STATE_MAP`/`STATE_MAP_REVERSE` 문자열 변환 없이 숫자를 그대로 사용한다.

`UserCard` 인터페이스의 `studyInfo: StudyInfo`는 `CardDetail.state: CardState`로 변경한다 (RFC-0006 D항).

### D. 타입/프로퍼티 리네이밍

RFC-0006에서 정의. 타입명(`KoreanCard` → `CardListItem` 등)과 프로퍼티명(`topics` → `categories`, `koreanWord` → `word` 등)의 리네이밍 상세는 RFC-0006 C·D·E항을 참조한다.

### E. 단어 조회 API 통합

`cards.ts`의 `getKoreanCardDetail`을 삭제하고 `words.ts`의 `getWordDetail`로 통합한다. `getWordDetail`의 반환 타입을 명시적으로 정의한다:

```ts
interface Translation {
  definition: string[];         // 외국어 정의 (배열)
  word: string[];               // 번역어 (배열)
  partsOfSpeech: string | null;
  pronunciation: string;
  originalLanguage: string;
  inflection: string;
  exampleUsage: string[];       // 예문 (배열)
}

interface Homograph {
  wordId: number;
  homographNumber: number;
  partOfSpeech: string | null;
  definition: string[];
}

interface WordDetail {
  wordId: number;
  word: string;
  homographNumber: number;
  categories: string[];
  definition: string[];
  translation: Translation | null;  // Translation이 없으면 null
  homographs: Homograph[];
}
```

### F. null 처리 통일

`postUserOption`에서 `coalesce` 제거. `UserOption`의 모든 필드는 필수이므로 INSERT와 UPDATE 모두 전달된 값을 그대로 사용한다:

```ts
.onConflictDoUpdate({
  target: userOptions.userId,
  set: {
    dailyReviewWords: sql`excluded.daily_review_words`,
    dailyStudyWords: sql`excluded.daily_study_words`,
    utcOffset: sql`excluded.utc_offset`,
    langCode: sql`excluded.lang_code`,
  },
})
```

### G. 캐시 키 검증

`userDeckKey`에 빈 문자열 검증을 추가한다:

```ts
export function userDeckKey(userId: string) {
  if (!userId) throw new Error('userId cannot be empty');
  return `decks:user:${userId}`;
}
```

### H. Auth.js 스키마 정합성 수정

**SQL (`scripts/create-tables.sql`):**
- `NOT NULL DEFAULT NULL` → `NOT NULL`로 통일
- `expires_at number` → `expires_at INTEGER`

**Drizzle (`src/db/schema.ts`):**
- `accounts`에 `(provider, providerAccountId)` 유니크 인덱스 추가
- `verificationTokens`에 `(identifier, token)` 복합 PK 적용

### I. 파일 구조

정리 후 `src/api/` 구조:

```
src/api/
├── auth-actions.ts   # signIn, signOut, getUserId, requireUserId
├── decks.ts          # getDecks, getCardsFromDeck, getUserStudyHistories
├── words.ts          # getWordDetail, searchWords
├── study.ts          # getLearningCards, postStudyInfo
└── option.ts         # getUserOption, postUserOption
```

`cards.ts`와 mock 파일(`*.mock.ts`)을 삭제한다.

## Alternatives Considered

### Server Action별로 독립된 인증 처리 유지

각 파일에 `getUserId()`를 두면 파일 간 의존성이 없다. 그러나 3곳의 동일 코드는 수정 시 누락 위험이 있고, `requireUserId()` 같은 패턴을 추가할 때 모든 파일을 수정해야 한다.

### DTO 레이어 유지

DTO를 유지하면 API 응답 형식 변경 시 도메인 모델에 영향을 주지 않는다. 그러나 Server Action은 호출자와 같은 프로세스에서 실행되므로 직렬화 경계가 REST API보다 훨씬 얇다. 불필요한 변환 레이어는 복잡성만 추가한다.

## Consequences

### Positive

- 중복 코드 제거로 인증 로직 변경 시 수정 지점이 1곳
- 레거시 타입/변환 유틸 제거로 코드 이해 비용 감소
- 응답 구조가 실제 사용 패턴과 일치 (불필요한 pagination 메타 제거)
- Auth.js 스키마 정합성 확보

### Negative

- 응답 타입 변경으로 프론트엔드 호출 코드도 함께 수정 필요 (`Paginated<T>` → 배열로 바뀌는 부분)
- `getWordDetail` 통합 시 기존 `getKoreanCardDetail` 호출부 수정 필요

## References

- [CodeRabbit 리뷰 결과 (PR #24)](https://github.com/nanana3679/hada-reboot/pull/24)
- [RFC-0008: Server Actions + 직접 DB 접근](docs/decisions/0008-server-actions-direct-db-access.md)
- [Auth.js D1 Adapter 스키마](https://authjs.dev/getting-started/adapters/d1)
