# Domain Glossary

프로젝트에서 사용하는 도메인 용어 정의. 코드 네이밍의 기준이 된다.

## 핵심 도메인

### Word

한국어 단어의 **사전 정보**. 불변 데이터.

- headword (표제어), 품사, 발음, 뜻풀이, 예문, 활용형, 어원 등
- DB: `words` 테이블
- 하나의 Word는 여러 Translation을 가질 수 있음

### Translation

Word의 **외국어 번역**. 언어별로 1:1.

- 번역어, 외국어 정의
- DB: `translations` 테이블 (word_id + lang_code 유니크)

### Card

Word를 **학습 단위**로 감싼 것. Word(학습의 대상) + Translation을 학습 가능한 형태로 포함한다.

- `CardListItem` — 덱 목록용 (요약 + 번역어 배열)
- `CardDetail` — 학습 화면용 (WordDetail + FSRS State). 클라이언트 전용 타입
- `UserCard` — DB 전용 (CardDetail + userId). `user_cards` 테이블에 대응

### Card State (`CardState` / ts-fsrs `Card`)

ts-fsrs 라이브러리의 **학습 상태**. 사용자별 가변 데이터.

- due, stability, difficulty, scheduled_days, reps, lapses, state, last_review
- state: 0=New, 1=Learning, 2=Review, 3=Relearning
- `CardState`는 ts-fsrs `Card`의 camelCase 래퍼 타입. `CardStateDTO`는 직렬화 버전
- `CardDetail.state`로 접근
- `schemes.ts`에서 정의. 다른 파일은 `import { CardState } from '@/types/schemes'`로 사용

### Deck

카테고리별 **Word 묶음**. 글로벌 통계(전체 카드 수)와 사용자별 통계(학습 상태별 수)를 포함.

- 물리적 테이블은 없음. Word의 `categories` 필드를 기준으로 집계.
- 캐시: KV에 글로벌/사용자별로 분리 저장

### UserOption

사용자별 **학습 설정**.

- 일일 복습 단어 수, 일일 신규 단어 수, UTC 오프셋, 언어 코드
- DB: `user_options` 테이블

### StudyHistory

사용자의 **학습 이력**. 날짜별 학습 유형(new/review)과 카테고리를 기록.

- DB: `user_study_history` 테이블

## 학습 관련

### StudyType

학습 유형. `'new'` (신규 학습) 또는 `'review'` (복습).

### lastRating

학습 중 동일 카드가 연속 출현하는 것을 방지하기 위한 필드. 현재 미사용 상태이며, 학습 순서 결정 알고리즘 재설계 시 재정의 예정.

## 분류 체계

### Category

Word를 분류하는 단일 단위. 하나의 Word는 여러 Category에 속할 수 있음 (JSON 배열).

- RFC-0006에서 level(easy/normal/hard)과 topic을 통합하여 모든 분류를 동일하게 취급
- `categoryType` (difficulty/meaning 구분)은 폐지. DB/API에서 구분하지 않음
- 프론트엔드에서 그룹핑이 필요한 경우 `CategoryGroup` 상수를 사용

### CategoryGroup

Category를 UI에서 그룹핑하기 위한 **프론트엔드 전용 상수**. DB/API 레이어에는 존재하지 않음.

- 예: `difficulty: ['easy', 'normal', 'hard']`, `topic: ['food', 'travel', ...]`
- `categoryType` 라우트 파라미터를 대체

## 네이밍 규칙

| 도메인 개념 | DB 테이블 | 코드 타입 | 변수/함수 접두사 |
|------------|-----------|----------|----------------|
| Word | `words` | `Word` (미정의, 정리 필요) | `word`, `getWordDetail` |
| Translation | `translations` | — | `trans`, `translation` |
| Card State | `user_cards` | `CardState` (ts-fsrs `Card` 래퍼) | `card`, `userCard` |
| Deck | — (집계) | `Deck` | `deck`, `getDecks` |
| Category | — (`words.categories` 요소) | `Category` | `category` |
| CategoryGroup | — (프론트엔드 상수) | `CATEGORY_GROUP` | — |
| UserOption | `user_options` | `UserOption` | `option`, `getUserOption` |
| StudyHistory | `user_study_history` | `UserStudyHistory` | `history`, `getUserStudyHistories` |
