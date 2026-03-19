# RFC-0002: 학습 데이터 기반 카드 난이도 자동 조정

| 항목 | 내용 |
|------|------|
| **Status** | proposed |
| **Author** | Team |
| **Created** | 2026-03-19 |
| **Updated** | 2026-03-19 |

## Summary

`review_logs` 데이터를 집계하여 카드의 기본 난이도 라벨(easy/normal/hard)이 실제 학습 난이도를 반영하는지 검증하고, 괴리가 확인되면 자동 재분류 파이프라인을 도입한다.

## Context

현재 카드의 `difficulty` 라벨은 수동으로 부여된 정적 값이다. 그러나 실제 난이도는 학습자에 따라 다르고, 같은 카드라도 모국어에 따라 체감 난이도가 크게 달라진다. 예를 들어 "경제"라는 단어는 한자권 학습자(일본어, 중국어)에게는 쉽지만 영어 화자에게는 어렵다.

RFC-0001에서 도입한 `review_logs` 테이블은 모든 학습 응답(rating, 응답 시간)을 기록한다. 이 데이터가 충분히 쌓이면 다음 가설을 검증할 수 있다.

## Hypothesis

### H1: 기존 난이도 라벨과 실제 학습 난이도 사이에 유의미한 괴리가 존재한다

**판정 지표 (Primary):**
- `avg_rating` — 카드별 평균 Rating (1~4). 낮을수록 어렵다
- `again_rate` — Again(1) 응답 비율. 높을수록 어렵다

**보조 지표 (참고용, 판정에 사용하지 않음):**
- `avg_elapsed_ms` — 평균 응답 시간. 기기 성능, 사용 맥락(출퇴근길 vs 집중 학습), 타이핑 방식 등 교란 변수가 많아 난이도 판정 지표로는 부적합하다. 다만 극단적 이상치 카드를 발견하는 보조 수단으로는 유용하다.

**검증 방법:** Phase 2 초반에 EDA(탐색적 데이터 분석)를 먼저 수행한다. 전체 카드의 avg_rating 분포에서 상위 33%를 easy, 하위 33%를 hard로 놓는 상대적 분위 기반 분류를 기준선으로 삼고, 기존 라벨과의 불일치율을 산출한다.

**판정 기준 (3구간):**

| 불일치율 (2단계 이상 괴리) | 판정 | 다음 단계 |
|--------------------------|------|----------|
| < 10% | 기각 | 현행 유지 |
| 10~20% | 보류 | 데이터 추가 수집 후 재검증 |
| > 20% | 채택 | Phase 3 진행 |

### H2: 모국어별로 카드 난이도가 유의미하게 다르다

**측정 지표:** H1과 동일하되, `users.language`로 그룹화

**검증 시기:** H2는 H1과 달리 언어 그룹당 충분한 표본이 필요하다. 소수 사용자의 극단값으로 잘못된 판정을 내릴 위험이 높으므로, Phase 2에서 즉시 검증하지 않고 **데이터가 충분히 축적된 후 별도로 검증**한다.

**최소 표본 기준 (H2 전용):**
- 언어 그룹당: 활성 사용자 20명 이상
- 카드-언어 조합당: 리뷰 30건 이상
- 비교 대상 언어 그룹이 최소 3개 이상

이 기준 충족 전까지 H2는 검증을 보류한다.

## Verification Plan

### Phase 1: 데이터 수집 (출시 후 2~4주)

별도 구현 없이 `review_logs`가 자연 축적되도록 한다.

**최소 표본 기준 (H1):**
- 전체: 1,000건 이상의 review_logs
- 카드당: 10건 이상 (미달 카드는 분석에서 제외)

**모니터링 쿼리:**

```sql
-- 데이터 축적 현황
SELECT COUNT(*) as total_reviews,
       COUNT(DISTINCT card_id) as cards_reviewed,
       COUNT(DISTINCT user_id) as active_users
FROM review_logs
WHERE reviewed_at >= date('now', '-7 days');

-- 카드별 표본 충족 현황
SELECT COUNT(*) as cards_with_enough_data
FROM (
  SELECT card_id, COUNT(*) as cnt
  FROM review_logs
  GROUP BY card_id
  HAVING cnt >= 10
);
```

### Phase 2: 가설 검증 (데이터 충족 후)

분석 쿼리를 실행하여 가설을 검증한다. 이 단계에서는 코드 변경 없이 D1에 직접 쿼리한다.

**쿼리 실행 환경:**
- 빠른 확인: Cloudflare Dashboard의 D1 콘솔에서 직접 실행
- 반복 실행: `scripts/queries/` 디렉토리에 `.sql` 파일로 저장하고 `wrangler d1 execute hada-db --file=scripts/queries/h1-verify.sql`로 실행

#### Step 1: EDA (탐색적 데이터 분석)

임계값을 사전에 고정하지 않고, 먼저 데이터의 실제 분포를 관찰한다.

```sql
-- 전체 카드의 avg_rating 분포 (분위수 파악)
SELECT
  c.difficulty as label,
  COUNT(DISTINCT c.id) as card_count,
  AVG(adjusted.avg_rating) as mean_rating,
  MIN(adjusted.avg_rating) as min_rating,
  MAX(adjusted.avg_rating) as max_rating
FROM cards c
JOIN (
  -- 사용자 편향을 줄이는 이중 평균: 사용자별 평균 → 카드별 평균
  SELECT card_id,
         AVG(user_avg_rating) as avg_rating
  FROM (
    SELECT card_id, user_id,
           AVG(rating) as user_avg_rating
    FROM review_logs
    GROUP BY card_id, user_id
  )
  GROUP BY card_id
) adjusted ON adjusted.card_id = c.id
GROUP BY c.difficulty;

-- 첫 리뷰만 분리 집계 (학습 순서 효과 통제)
SELECT c.difficulty as label,
       COUNT(DISTINCT c.id) as card_count,
       AVG(first_review.rating) as avg_first_rating,
       AVG(CASE WHEN first_review.rating = 1 THEN 1.0 ELSE 0.0 END) as first_again_rate
FROM cards c
JOIN (
  SELECT rl.*
  FROM review_logs rl
  INNER JOIN (
    SELECT card_id, user_id, MIN(reviewed_at) as first_at
    FROM review_logs
    GROUP BY card_id, user_id
  ) first ON rl.card_id = first.card_id
         AND rl.user_id = first.user_id
         AND rl.reviewed_at = first.first_at
) first_review ON first_review.card_id = c.id
GROUP BY c.difficulty;
```

EDA 결과를 바탕으로 상대적 분위 경계(상위/하위 33%)를 설정한다.

#### Step 2: H1 검증

```sql
-- 이중 평균을 적용한 괴리 카드 식별
-- (사용자별 평균을 먼저 낸 뒤, 그 평균의 평균을 카드별로 산출)
SELECT c.id, c.word, c.difficulty as label,
       adjusted.avg_rating,
       adjusted.again_rate,
       adjusted.user_count
FROM cards c
JOIN (
  SELECT card_id,
         AVG(user_avg_rating) as avg_rating,
         AVG(user_again_rate) as again_rate,
         COUNT(DISTINCT user_id) as user_count
  FROM (
    SELECT card_id, user_id,
           AVG(rating) as user_avg_rating,
           AVG(CASE WHEN rating = 1 THEN 1.0 ELSE 0.0 END) as user_again_rate
    FROM review_logs
    GROUP BY card_id, user_id
  )
  GROUP BY card_id
  HAVING COUNT(DISTINCT user_id) >= 3
) adjusted ON adjusted.card_id = c.id;
```

EDA에서 산출한 분위 경계와 기존 라벨을 비교하여 불일치율을 산출한다.

#### Step 3: H2 검증 (표본 충족 시에만)

H2 최소 표본 기준이 충족된 경우에만 실행한다.

```sql
-- 언어별 카드 난이도 차이 (이중 평균 적용)
SELECT card_id, language,
       AVG(user_avg_rating) as lang_avg_rating,
       COUNT(DISTINCT user_id) as user_count
FROM (
  SELECT rl.card_id, u.language, rl.user_id,
         AVG(rl.rating) as user_avg_rating
  FROM review_logs rl
  JOIN users u ON u.id = rl.user_id
  GROUP BY rl.card_id, u.language, rl.user_id
)
GROUP BY card_id, language
HAVING COUNT(DISTINCT user_id) >= 5;
```

**판정 기준:**

| 결과 | 다음 단계 |
|------|----------|
| H1 채택, H2 미검증/기각 | 글로벌 난이도 재분류 (Phase 3A) |
| H1 채택, H2 채택 | 언어별 난이도 분리 (Phase 3B) |
| H1 보류 | 데이터 추가 수집 후 재검증 |
| H1 기각 | 현행 유지. 이 RFC를 rejected로 변경 |

### Phase 3A: 글로벌 난이도 재분류

H1만 채택된 경우. Cron Trigger(주 1회)로 카드별 지표를 집계하여 `cards.difficulty`를 업데이트한다.

**분류 로직:**

EDA에서 산출한 분위 경계를 기준으로 분류한다. 초기 기준선 예시:

```
상위 33% (avg_rating 기준) → easy
중간 34% → normal
하위 33% → hard
```

이 임계값은 Phase 2 EDA 결과에 따라 확정하며, 주기적으로 재보정한다.

**히스테리시스 (진동 방지):**

경계선 카드가 매주 easy ↔ normal을 반복하는 것을 방지하기 위해, 전환 임계값에 여유 마진을 둔다. 예를 들어 분위 경계가 avg_rating 3.0이라면:

- normal → easy 전환: avg_rating > 3.1
- easy → normal 복귀: avg_rating < 2.9

마진 크기(±0.1)는 Phase 2에서 관찰한 분포의 표준편차를 참고하여 설정한다.

**안전장치:**
- 최소 표본 미달 카드는 기존 라벨 유지
- 한 번에 2단계 변경 방지 (easy → hard 불가, easy → normal만 허용)
- 변경 이력을 별도 로그에 기록
- 이중 평균을 사용하여 다량 리뷰 사용자의 가중치 편향 방지

### Phase 3B: 언어별 난이도 분리

H2도 채택된 경우. `cards.difficulty`를 단일 값 대신 언어별 JSON으로 확장하거나, 별도 `card_difficulty_by_language` 테이블을 추가한다.

이 경우 스키마 변경이 필요하므로 별도 RFC로 분리한다.

## Statistical Considerations

### 교란 변수 통제

**학습 순서 효과:** 같은 카드라도 첫 리뷰는 어렵고 반복할수록 쉬워진다. 카드별 단순 평균을 내면 리뷰 횟수가 많은 카드가 "쉬운" 쪽으로 편향된다. 이를 통제하기 위해:
- Phase 2 EDA에서 **첫 리뷰만 분리 집계**한 결과를 전체 평균과 비교한다
- 두 결과가 크게 다르면, 첫 리뷰 기반 분석을 주 판정 근거로 사용한다

**사용자 숙련도 편향:** 열심히 학습하는 사용자일수록 리뷰 수가 많고 대체로 정답률이 높다. 단순 집계에서 이들의 가중치가 커지므로 전체 난이도가 쉽게 보이는 쪽으로 치우친다. 이를 방지하기 위해 **이중 평균**(사용자별 평균 → 카드별 평균)을 사용한다.

### 임계값 설정 원칙

절대 임계값(avg_rating > 3.0이면 easy)을 사전에 고정하지 않는다. 데이터 분포는 사용자 구성, 카드셋, 시기에 따라 달라지므로, Phase 2 EDA에서 관찰한 분포를 기반으로 상대적 분위 경계를 설정한다.

## Alternatives Considered

### FSRS 자체 difficulty 파라미터에 의존

ts-fsrs는 학습을 반복하며 개인별 `difficulty` 파라미터를 자동 조정한다. 그러나 이것은 개인 레벨의 스케줄링 파라미터이지, 카드 자체의 난이도 라벨이 아니다. 사용자가 덱을 "쉬운 것부터" 정렬하거나 난이도별로 필터링할 때는 카드의 기본 라벨이 필요하다.

### 관리자가 수동으로 주기적 재분류

데이터 기반으로 목록을 뽑고 관리자가 판단하는 방식. 정확도는 높을 수 있으나 1인 프로젝트에서 지속적으로 수행하기 어렵다. 자동화가 가능한 부분은 자동화하되, Phase 3에서 변경 이력을 남겨 수동 검토도 가능하게 한다.

## Consequences

### Positive

- 학습 데이터 기반의 객관적 난이도 분류가 가능해진다
- 사용자 경험 개선 — "easy인데 왜 이렇게 어렵지?"라는 불일치 감소
- Phase 1~2는 코드 변경 없이 검증 가능하므로 리스크가 낮다
- 이중 평균과 첫 리뷰 분리 집계로 통계적 편향을 줄인다

### Negative

- 충분한 데이터가 쌓이기까지 시간이 필요하다 (H1: 최소 2~4주, H2: 수개월)
- 자동 재분류 도입 시 Cron Trigger 설정과 운영 부담이 추가된다
- 소수 사용자의 데이터로 일반화하면 편향이 발생할 수 있다 (이중 평균으로 완화하나 완전 제거는 불가)

### Neutral

- 기존 수동 라벨은 초기 데이터가 없을 때의 기본값으로 계속 사용된다
- Phase 2 결과에 따라 Phase 3을 진행하지 않을 수 있다 (가설 기각 시)
- H2 검증은 충분한 사용자 확보 후로 별도 분리한다

## References

- [ts-fsrs difficulty 파라미터](https://github.com/open-spaced-repetition/ts-fsrs)
- [FSRS 알고리즘 논문](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- RFC-0001: API 설계 (`review_logs` 테이블 정의)
