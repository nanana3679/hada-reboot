# RFC-0006: 도메인 용어 정의 및 네이밍 통일

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | nanana3679 |
| **Created** | 2026-03-21 |
| **Updated** | 2026-03-24 |

## Summary

도메인 용어를 정의하고, 코드 전반의 타입명·프로퍼티명을 통일한다.

1. level과 topic을 category로 통합하고, `categoryType` 분기를 제거한다.
2. Word(학습의 대상)와 Card(학습의 단위)의 경계를 명확히 하고, 이에 맞게 타입과 프로퍼티를 리네이밍한다.

## Context

### 카테고리 분류 문제

기존 구조는 원본 CSV의 컬럼 구조를 그대로 DB에 반영했다:

- `level` 컬럼: 어휘 등급 (easy/normal/hard) — CSV의 `어휘 등급`
- `topics` JSON 배열: 주제/상황 범주 — CSV의 `주제 및 상황 범주`

이로 인해 `/api/decks?type=level|topic` API에 분기가 생겼다:

- `type=level`일 때: `GROUP BY words.level`
- `type=topic`일 때: `json_each(words.topics)` + `GROUP BY json_each.value`

두 분기는 동일한 목적(카테고리별 단어 수 집계)을 수행하지만 쿼리 로직이 달랐고, 프론트엔드에서도 `CategoryType('difficulty' | 'meaning')` 구분이 필요했다. 카드 필터(`/api/decks/cards`, `/api/study/cards`)에서도 `isLevel` 분기가 반복되었다.

level과 topic은 본질적으로 같은 개념(단어를 분류하는 카테고리)이며, 별도로 취급할 기술적·비즈니스적 이유가 없다.

### 타입 네이밍 혼란

Spring Boot REST API에서 Next.js Server Action으로 전환하면서 설계 없이 구현을 진행한 결과, 타입명과 프로퍼티명이 도메인 용어와 불일치한다:

- `KoreanCard`는 실제로 Word의 기본 정보를 담고 있다
- `cardId`가 `words.id`를 참조한다
- `koreanWord`는 한국어 학습 앱에서 "korean" 접두사가 불필요하다
- `studyInfo`는 ts-fsrs `Card` 타입인데 이름이 모호하다
- `topics`는 이미 category로 통합했는데 프로퍼티명이 남아있다

## Decision

### A. 카테고리 통합

`level`과 `topic`을 `categories` 배열로 통합한다. 구체적으로:

1. **CSV 변환**: `어휘 등급` + `주제 및 상황 범주`를 `categories` JSON 배열로 합친다. 한글 topic은 영문 snake_case로 1:1 매핑한다 (78개 topic + 3개 difficulty = 81개 카테고리).

2. **DB 스키마**: `words.level` 컬럼을 삭제한다. `user_study_history`에서 `deck_type` 컬럼을 삭제하고 `deck_name`을 `category`로 변경한다.

3. **API**: 모든 엔드포인트에서 `type=level|topic` 파라미터와 `isLevel` 분기를 제거한다. 카테고리 필터는 `json_each(categories)` EXISTS 서브쿼리 하나로 통일한다.

4. **프론트엔드 타입**: `Difficulty`, `Meaning`, `CategoryType` 타입을 삭제하고 `Category` 단일 union 타입으로 통합한다.

5. **그룹핑**: `categoryType` 라우트 파라미터를 폐지한다. 카테고리 값 자체만으로도 어떤 그룹에 속하는지 알 수 있다 — `'easy'`면 difficulty, `'food'`면 topic이다. 프론트엔드에서 `CATEGORY_GROUP` 상수로 처리한다:

```ts
// src/constants/category.ts
export const CATEGORY_GROUP = {
  difficulty: ['easy', 'normal', 'hard'],
  topic: ['food', 'travel', ...],
} as const;
```

### B. 도메인 용어 정의

| 용어 | 정의 | 성격 |
|------|------|------|
| **Word** | 한국어 단어의 사전 정보 (headword, 품사, 발음, 뜻풀이 등) | 불변 |
| **Translation** | Word의 외국어 번역 | 불변 |
| **Card** | Word + Translation을 학습 단위로 감싼 것. Word는 학습의 대상, Card는 학습의 단위 | — |
| **Card State** | ts-fsrs `Card` 타입. 사용자별 FSRS 학습 상태 (due, stability, difficulty 등) | 가변 |
| **Category** | Word를 분류하는 단일 단위. level과 topic 구분 없음 | 불변 |
| **CategoryGroup** | Category를 UI에서 그룹핑하기 위한 프론트엔드 전용 상수 | — |
| **Deck** | Category별 Card 묶음의 통계 | — |

### C. 타입 리네이밍

| 현재 | 제안 | 사유 |
|------|------|------|
| `KoreanCard` | 삭제 | 베이스 타입으로만 사용, 사용처 2곳이므로 각 타입에 직접 선언 |
| `KoreanCardWithForeignWords` | `CardListItem` | 용도 기반 — 덱 목록의 각 항목 |
| `KoreanCardDetail` | `WordDetail` | Word 상세 정보 (사전 데이터 + Translation + Homographs) |
| `UserCard` (schemes.ts) | `CardDetail` | 클라이언트용 — WordDetail + FSRS State. DB의 `UserCard`(user_cards)는 여기에 userId가 추가된 서버 전용 개념 |
| `Card` (schemes.ts) | 삭제 | Word + Translation을 담는 레거시 타입, 도메인의 Card와 혼동 |
| `CategoryType` | 삭제 | `CATEGORY_GROUP` 상수로 대체 |
| `StudyInfo` | `CardState` | ts-fsrs `Card`의 camelCase 래퍼. `StudyInfo`는 모호하므로 도메인 용어에 맞춰 변경 |
| `StudyInfoDTO` | `CardStateDTO` | `CardState`의 직렬화 버전 |
| `UserCardDTO` | `CardDetailDTO` | `CardDetail`의 직렬화 버전. `UserCard` → `CardDetail` 리네이밍에 맞춤 |

### D. 프로퍼티 리네이밍

| 현재 | 제안 | 사유 |
|------|------|------|
| `topics` | `categories` | level과 topic을 category로 통합 |
| `koreanWord` | `word` | 한국어 학습 앱이므로 "korean" 접두사 불필요 |
| `cardId` (Word 도메인) | `wordId` | Word를 표현하는 타입에서는 `wordId` 사용 |
| `cardId` (Card 도메인) | `cardId` 유지 | Card를 표현하는 타입에서는 유지 |
| `UserCard.koreanCard` | `CardDetail.word: WordDetail` | 클라이언트에서는 `CardDetail`을 사용. 이전에는 구현 제약으로 요약 정보만 담았으나, 이제 상세정보를 직접 포함하여 학습 시 별도 prefetching 불필요 |
| `UserCard.studyInfo` | `CardDetail.state: CardState` | FSRS 학습 상태를 명확히 표현. 타입은 ts-fsrs `Card`의 camelCase 래퍼(`CardState`) |

### E. ts-fsrs `Card` 네이밍 충돌 처리

레거시 `Card` 타입(schemes.ts)은 삭제하지만, ts-fsrs 라이브러리가 export하는 `Card` 타입은 그대로 사용한다. 코드에서 혼동을 방지하기 위해:

- `schemes.ts`에서 `import { Card as FSRSCard } from 'ts-fsrs'`로 받아 `CardState` 타입을 정의한다 (FSRSCard의 camelCase 래퍼)
- 다른 모든 파일은 `import { CardState } from '@/types/schemes'`로 사용한다. ts-fsrs의 `Card`를 직접 import하지 않는다
- 즉 `schemes.ts`가 ts-fsrs `Card` → `CardState` 변환의 유일한 엔트리포인트 역할을 한다

### F. DB 프로퍼티명

DB 컬럼과 Drizzle 스키마도 통일한다:

| 현재 (DB) | 현재 (Drizzle) | 제안 (Drizzle) |
|-----------|---------------|---------------|
| `topics` (JSON) | `words.topics` | `words.categories` |

`user_cards` 테이블명은 유지한다 — "사용자의 학습 카드"로 도메인과 일치.

## Alternatives Considered

### level 컬럼 유지 + API 분기 유지

기존 구조를 그대로 두는 방안. CSV 원본과 1:1 대응되어 데이터 추적이 쉽다. 그러나 API의 불필요한 복잡도가 유지되고, KV 캐싱 구현 시에도 `decks:global:level` / `decks:global:topic` 이중 캐시 키가 필요하다. 구현 복잡도 대비 이점이 없어 기각했다.

### level을 topics에 통합하되 DB에 category_group 컬럼 추가

카테고리 그룹(difficulty/topic)을 DB에 저장하는 방안. 그룹핑이 고정 데이터이므로 DB에 중복 저장할 필요가 없다. 프론트엔드 코드에서 상수로 관리하는 것이 단순하다.

### Korean 접두사 유지

`KoreanCard`, `koreanWord` 등의 네이밍을 유지하는 방안. 다국어 학습 앱으로 확장할 경우 구분이 필요할 수 있다. 그러나 현재는 한국어 전용 앱이며, 확장 시점에 리네이밍해도 충분하다. YAGNI 원칙에 따라 기각.

## Consequences

### Positive

- API 코드에서 `type=level|topic` 분기가 사라져 코드량 감소
- 카테고리 필터가 `json_each(categories)` EXISTS 하나로 통일
- KV 캐싱 구현 시 캐시 키가 `decks:global` 하나로 단순해짐
- 타입명이 도메인 용어와 일치하여 코드 이해 비용 감소
- `categoryType` 라우트 제거로 URL 구조 단순화

### Negative

- 원본 CSV와 DB 구조가 1:1 대응되지 않아, 데이터 출처를 추적하려면 매핑 스크립트를 참조해야 함
- 리네이밍 영향 범위가 넓음 (타입, 프로퍼티, 컴포넌트 props, DB 컬럼)
- difficulty(easy/normal/hard) 판별이 배열 탐색으로 바뀌어 약간 비효율적 (실질적 영향 없음)

## References

- RFC-0004: D1 + Drizzle 백엔드 재설계 — 기존 덱 집계 및 KV 캐싱 전략
- RFC-0009: Server Action API 설계 — 리네이밍 적용 대상
- `docs/glossary.md` — 도메인 용어집
- `scripts/migrate-csv-categories.py` — CSV 변환 1회용 스크립트
- `legacy/korean-words.csv` — 변환 전 원본 CSV
