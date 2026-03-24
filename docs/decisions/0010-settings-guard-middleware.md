# RFC-0010: 로그인 시 브라우저 정보 기반 user_options 자동 생성

| 항목 | 내용 |
|------|------|
| **Status** | proposed |
| **Author** | nanana3679 |
| **Created** | 2026-03-24 |
| **Updated** | 2026-03-24 |

## Summary

최초 로그인 시 브라우저에서 `utcOffset`을 자동 수집하고, URL path의 `locale`과 함께 `user_options` 행을 생성한다. `has-options` 쿠키로 초기화 완료 여부를 캐싱하여 이후 요청에서 DB 조회를 방지한다. 이전 Spring Boot 서버에서 사용하던 "설정 없으면 settings 페이지로 리다이렉트" 방식을 대체한다.

## Context

이전 Spring Boot 서버에서는 `user_options` 행이 없는 사용자를 settings 페이지로 강제 리다이렉트하여 초기 설정을 입력하게 했다.

현재 Next.js + Cloudflare Workers로 전환한 뒤에도 동일한 문제가 남아 있다:

- Google OAuth 로그인 성공 시 세션은 생기지만, `user_options` 테이블에 행이 없다
- `getUserOption()`은 행이 없으면 하드코딩된 기본값(`utcOffset: 0`, `languageCode: 'en'`)을 반환한다
- `utcOffset`이 맞지 않으면 학습 날짜 기준이 틀어진다

`utcOffset`은 브라우저의 `new Date().getTimezoneOffset()`으로 수집 가능하고, `locale`은 이미 URL path의 `[locale]`에 있다.

## Decision

### 1. 수집 대상

| 값 | 출처 | 변환 |
|---|---|---|
| `utcOffset` | `new Date().getTimezoneOffset()` (브라우저) | 분 단위 → 시간 단위 (부호 반전: `-540` → `9`) |
| `languageCode` | URL path `[locale]` (서버) | 변환 불필요 |

### 2. 흐름

```
1. 사용자가 /login 페이지에서 Google 로그인 버튼 클릭
2. OAuth 완료 → Auth.js 세션 생성 → 리다이렉트
3. 서버(locale layout)에서 has-options 쿠키 확인
   a. 쿠키 있음 → 통과 (DB 조회 없음)
   b. 쿠키 없음 + 로그인 상태 → UserOptionInitializer 클라이언트 컴포넌트 렌더링
4. 클라이언트에서 utcOffset 수집 → initUserOption(locale, utcOffset) 서버 액션 호출
5. 서버 액션에서:
   a. hasUserOption() → 이미 있으면 생성 스킵
   b. 없으면 → postUserOption()으로 생성
   c. has-options 쿠키 세팅
6. 이후 요청에서는 쿠키가 있으므로 3a에서 통과
```

### 3. 기존 설정 존재 여부 판별

현재 `getUserOption()`은 행이 없어도 기본값을 반환하므로 구분이 불가하다. 다음과 같이 변경한다:

- `getUserOption()`: 행이 없으면 **에러를 throw**한다. 자동 생성 로직이 있으므로, 정상 흐름에서 행이 없는 상황은 발생하지 않아야 한다.
- `hasUserOption(): Promise<boolean>`: 별도 추가. `initUserOption` 서버 액션에서 설정이 없으면 생성한다.
- `initUserOption(locale, utcOffset)`: 신규. `hasUserOption()` 확인 → 없으면 생성 → `has-options` 쿠키 세팅.

### 4. `dailyReviewWords`, `dailyStudyWords`는?

이 두 값은 브라우저에서 자동 수집할 수 없다. 서버 측 기본값(`20`, `10`)을 그대로 사용한다. 사용자가 나중에 settings 페이지에서 변경할 수 있다.

### 5. 쿠키 생명주기

| 시점 | 동작 |
|------|------|
| `initUserOption` 실행 | `has-options=1` 쿠키 세팅 |
| 로그아웃 (`signOutAction`) | `has-options` 쿠키 삭제 |

### 6. 변경 대상 파일

- `src/api/option.ts` — `getUserOption()` 에러 throw, `hasUserOption()` 추가, `initUserOption()` 추가
- `src/hooks/useInitUserOption.ts` — 브라우저 utcOffset 수집 + `initUserOption()` 호출
- `src/components/UserOptionInitializer.tsx` — 훅을 감싸는 클라이언트 컴포넌트 (locale prop)
- `src/app/[locale]/layout.tsx` — 쿠키 확인 후 조건부 `UserOptionInitializer` 렌더링
- `src/api/auth-actions.ts` — 로그아웃 시 `has-options` 쿠키 삭제

## Alternatives Considered

### 미들웨어에서 settings 페이지로 리다이렉트 (이전 Spring Boot 방식)

설정이 없는 사용자를 middleware에서 `/settings`로 강제 리다이렉트하는 방식.

**장점**: 설정 완료를 강제할 수 있다.

**기각 사유**:
- `utcOffset`은 브라우저가 이미 알고 있는 값이므로, 사용자에게 수동 입력을 요구하는 것은 불필요한 마찰이다
- middleware의 분기 복잡도가 증가한다

### Auth.js signIn 콜백에서 직접 생성

서버 사이드 콜백에서 `user_options`를 생성하는 방식.

**장점**: 클라이언트 훅 없이 서버에서 완결된다.

**기각 사유**:
- Auth.js 콜백은 서버에서 실행되므로 브라우저의 `timezone`에 접근할 수 없다
- HTTP 헤더(`CF-Timezone`)로 추정할 수는 있지만 정확도가 떨어진다

### 서버 layout에서 매 요청마다 DB 조회

쿠키 없이 layout에서 `hasUserOption()`을 직접 호출하는 방식.

**장점**: 쿠키 관리가 불필요하다.

**기각 사유**:
- 모든 로그인 사용자의 모든 페이지 요청에서 DB 쿼리 1회가 추가된다
- 설정은 한 번 생성하면 거의 변하지 않으므로, 매번 조회하는 것은 과도하다

## Consequences

### Positive

- 최초 로그인 사용자가 설정 페이지를 거치지 않아도 올바른 `utcOffset`과 `languageCode`로 즉시 학습을 시작할 수 있다
- 쿠키 기반이므로 이후 요청에서 DB 조회가 발생하지 않는다
- middleware 복잡도가 증가하지 않는다

### Negative

- 브라우저 `utcOffset`이 100% 정확하지 않을 수 있다 (예: VPN 사용). 사용자가 settings 페이지에서 수정 가능하므로 치명적이지 않다
- `getUserOption()`이 행이 없으면 에러를 throw하므로, 기존 호출부에서 에러 처리가 필요하다
- 쿠키가 삭제/만료되면 `initUserOption` 서버 액션이 한 번 더 호출되지만, 이미 설정이 있으면 생성을 스킵하고 쿠키만 재세팅한다

## References

- RFC-0005: Auth.js + D1 + Google OAuth
- RFC-0008: Server Actions + 직접 DB 접근
- `src/api/option.ts` — `getUserOption`, `postUserOption`, `initUserOption`
- `src/db/schema.ts:108` — `user_options` 테이블 스키마
- MDN: [`Date.getTimezoneOffset()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
