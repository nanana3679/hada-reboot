# RFC-0011: 덱 프로그레스바의 New 카드 수 산출 방식

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | Team |
| **Created** | 2026-03-24 |
| **Updated** | 2026-03-24 |

## Summary

덱 프로그레스바의 New 카드 수를 `cardCounts - learningCounts - maturityCounts - overdueCounts`로 산출한다. `userCards` 레코드가 없는 카드는 암묵적으로 New로 간주한다.

## Context

`DeckProgressBar`는 덱의 학습 상태를 시각적으로 보여주는 컴포넌트다. 학습 통계는 `getDecks()` 서버 액션에서 `userCards` 테이블을 `GROUP BY`로 집계하여 반환한다.

문제는 `userCards`에 레코드가 없는 카드가 어떤 카운트에도 포함되지 않는다는 것이다:

- 덱에 카드 4장, 1장만 Learning 상태 → `learningCounts = 1`, `newCounts = 0`, 나머지 0
- 실제로는 3장이 New인데, `userCards` 레코드 자체가 없어서 집계에서 빠짐
- 모든 값이 0인 경우 `ProgressBar`에서 `sum = 0`으로 나누기 → `NaN%` → 바가 렌더링되지 않음

현재 덱 데이터는 글로벌 통계(`cardCounts`)와 유저별 학습 통계를 합쳐서 반환하며, 캐시 레이어(`setUserDeckCache`, `setGlobalDeckCache`)가 존재하여 매 요청마다 집계 쿼리를 실행하지는 않는다.

## Decision

`getDecks()` 서버 액션에서 `newCounts`를 `cardCounts - learningCounts - overdueCounts - maturityCounts`로 계산하여 내려주기로 한다.

```ts
// src/api/decks.ts — getDecks()
const stats = userCardStats[category] ?? {
  learningCounts: 0,
  overdueCounts: 0,
  maturityCounts: 0,
};
return {
  category,
  cardCounts,
  newCounts: cardCounts - stats.learningCounts - stats.overdueCounts - stats.maturityCounts,
  learningCounts: stats.learningCounts,
  overdueCounts: stats.overdueCounts,
  maturityCounts: stats.maturityCounts,
};
```

프론트엔드(`DeckProgressBar`)는 서버가 내려준 값을 그대로 사용하며, 도메인 로직을 갖지 않는다.

이 방식은 `userCards` 레코드 유무와 관계없이 정확한 New 수를 보장한다:
- 레코드 없는 카드 → New에 포함
- `state = 0`(명시적 New) 카드 → New에 포함
- 일부만 학습한 경우에도 정확한 비율 표시

## Alternatives Considered

### 계정 생성 시 모든 카드의 userCards 레코드를 New 상태로 생성

계정이 만들어질 때 모든 단어에 대해 `state = 0`(New)인 `userCards` 행을 미리 생성하면, `getDecks()` 집계 쿼리가 자연스럽게 New 카운트를 반환한다.

장점: 프론트엔드에 특수 로직이 필요 없고, 데이터가 항상 정확하다.

기각 사유: 단어 수가 수천 개 이상이면 계정 생성 시 대량 INSERT가 발생한다. 실제로 학습하지 않은 카드에 대한 레코드를 관리하는 것은 불필요한 비용이다.

### 덱 학습 상태 전용 테이블 생성

`deck_study_state` 같은 별도 테이블에 카테고리별 집계 값을 저장하고, 카드 상태 변경 시 이 테이블을 동기화한다.

장점: 매번 `userCards`를 집계하지 않아도 되어 읽기 성능이 좋다.

기각 사유: 이미 캐시 레이어가 동일한 역할을 하고 있다. 별도 테이블을 추가하면 `userCards` 변경 시 두 곳(userCards + 집계 테이블)을 업데이트해야 하여 정합성 관리 포인트가 증가한다.

## Consequences

### Positive

- DB 스키마 변경 없이 프론트엔드만으로 해결
- 의미적으로 정확한 표현 (미학습 카드 = New)
- 기존 캐시 레이어와 충돌 없음

### Negative

- `userCards`의 `state = 0`(명시적 New) 집계 값을 버리고 역산으로 대체하므로, 추후 새로운 카드 상태가 추가되면 이 계산식도 함께 수정해야 함

## References

- `src/components/ProgressBar/DeckProgressBar.tsx` — 수정 대상 컴포넌트
- `src/components/ProgressBar/ProgressBar.tsx:28` — `sum = 0` 시 NaN 발생 지점
- `src/api/decks.ts` — `getDecks()` 서버 액션, 학습 기록 없을 때 0으로 채우는 로직
