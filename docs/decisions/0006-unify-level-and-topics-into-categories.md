# RFC-0006: level과 topic을 categories로 통합

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | nanana3679 |
| **Created** | 2026-03-21 |
| **Updated** | 2026-03-21 |

## Summary

`words` 테이블의 `level` 컬럼(easy/normal/hard)을 삭제하고, `topics` JSON 배열에 통합한다. API에서 `type=level|topic` 분기를 제거하고, 모든 카테고리를 동일한 방식(`json_each(topics)`)으로 집계한다. 카테고리 그룹핑은 프론트엔드에서 처리한다.

## Context

기존 구조는 원본 CSV의 컬럼 구조를 그대로 DB에 반영했다:

- `level` 컬럼: 어휘 등급 (easy/normal/hard) — CSV의 `어휘 등급`
- `topics` JSON 배열: 주제/상황 범주 — CSV의 `주제 및 상황 범주`

이로 인해 `/api/decks?type=level|topic` API에 분기가 생겼다:

- `type=level`일 때: `GROUP BY words.level`
- `type=topic`일 때: `json_each(words.topics)` + `GROUP BY json_each.value`

두 분기는 동일한 목적(카테고리별 단어 수 집계)을 수행하지만 쿼리 로직이 달랐고, 프론트엔드에서도 `CategoryType('difficulty' | 'meaning')` 구분이 필요했다. 카드 필터(`/api/decks/cards`, `/api/study/cards`)에서도 `isLevel` 분기가 반복되었다.

level과 topic은 본질적으로 같은 개념(단어를 분류하는 카테고리)이며, 별도로 취급할 기술적·비즈니스적 이유가 없다.

## Decision

`level`을 `topics` 배열의 한 요소로 통합한다. 구체적으로:

1. **CSV 변환**: `어휘 등급` + `주제 및 상황 범주`를 `categories` JSON 배열로 합친다. 한글 topic은 영문 snake_case로 1:1 매핑한다 (78개 topic + 3개 difficulty = 81개 카테고리).

2. **DB 스키마**: `words.level` 컬럼을 삭제한다. `user_study_history`에서 `deck_type` 컬럼을 삭제하고 `deck_name`을 `category`로 변경한다.

3. **API**: 모든 엔드포인트에서 `type=level|topic` 파라미터와 `isLevel` 분기를 제거한다. 카테고리 필터는 `json_each(topics)` EXISTS 서브쿼리 하나로 통일한다.

4. **프론트엔드 타입**: `Difficulty`, `Meaning`, `CategoryType` 타입을 삭제하고 `Category` 단일 union 타입으로 통합한다.

5. **그룹핑**: difficulty(easy/normal/hard)와 topic의 구분이 필요한 경우 프론트엔드 코드에서 처리한다. DB/API 레이어에서는 모든 카테고리를 동일하게 취급한다.

## Alternatives Considered

### level 컬럼 유지 + API 분기 유지

기존 구조를 그대로 두는 방안. CSV 원본과 1:1 대응되어 데이터 추적이 쉽다. 그러나 API의 불필요한 복잡도가 유지되고, KV 캐싱 구현 시에도 `decks:global:level` / `decks:global:topic` 이중 캐시 키가 필요하다. 구현 복잡도 대비 이점이 없어 기각했다.

### level을 topics에 통합하되 DB에 category_group 컬럼 추가

카테고리 그룹(difficulty/topic)을 DB에 저장하는 방안. 그룹핑이 고정 데이터이므로 DB에 중복 저장할 필요가 없다. 프론트엔드 코드에서 상수로 관리하는 것이 단순하다.

## Consequences

### Positive

- API 코드에서 `type=level|topic` 분기가 사라져 `/api/decks/route.ts`가 116행 → 63행으로 감소
- 카테고리 필터가 `json_each(topics)` EXISTS 하나로 통일되어 유지보수가 쉬워짐
- KV 캐싱 구현 시 캐시 키가 `decks:global` 하나로 단순해짐
- 프론트엔드 타입이 `Category` 하나로 통합되어 타입 관련 유틸리티(`getCategoryType`, `normalizeQuery`)가 불필요해짐

### Negative

- 원본 CSV와 DB 구조가 1:1 대응되지 않아, 데이터 출처를 추적하려면 매핑 스크립트를 참조해야 함
- 원본 CSV를 `legacy/` 폴더에 별도 보관해야 함
- difficulty(easy/normal/hard) 판별이 topics 배열 탐색으로 바뀌어, 단일 필드 접근보다 약간 비효율적 (실질적 영향 없음)

## References

- RFC-0004: D1 + Drizzle 백엔드 재설계 — 기존 덱 집계 및 KV 캐싱 전략
- `scripts/migrate-csv-categories.py` — CSV 변환 1회용 스크립트
- `legacy/korean-words.csv` — 변환 전 원본 CSV
