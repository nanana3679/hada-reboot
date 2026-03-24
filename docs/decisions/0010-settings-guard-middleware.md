# RFC-0010: 로그인 시 브라우저 정보 기반 user_options 자동 생성

| 항목 | 내용 |
|------|------|
| **Status** | proposed |
| **Author** | nanana3679 |
| **Created** | 2026-03-24 |
| **Updated** | 2026-03-24 |

## Summary

최초 로그인 시 브라우저에서 `utcOffset`과 `locale`을 자동 수집하여 `user_options` 행을 생성한다. 이전 Spring Boot 서버에서 사용하던 "설정 없으면 settings 페이지로 리다이렉트" 방식을 대체한다.

## Context

이전 Spring Boot 서버에서는 `user_options` 행이 없는 사용자를 settings 페이지로 강제 리다이렉트하여 초기 설정을 입력하게 했다.

현재 Next.js + Cloudflare Workers로 전환한 뒤에도 동일한 문제가 남아 있다:

- Google OAuth 로그인 성공 시 세션은 생기지만, `user_options` 테이블에 행이 없다
- `getUserOption()`은 행이 없으면 하드코딩된 기본값(`utcOffset: 0`, `languageCode: 'en'`)을 반환한다
- `utcOffset`이 맞지 않으면 학습 날짜 기준이 틀어지고, `languageCode`가 다르면 UI 언어가 잘못 표시된다

그런데 `utcOffset`과 `locale`은 **브라우저가 이미 알고 있는 정보**다:

- `new Date().getTimezoneOffset()` → UTC 오프셋 (분 단위)
- `navigator.language` → 브라우저 locale (예: `ko`, `en`, `ja`)

사용자에게 직접 입력을 요구할 필요 없이, 로그인 시점에 자동 수집하면 된다.

## Decision

로그인 직후 브라우저 정보를 수집하여 `user_options` 행을 자동 생성한다.

### 1. 수집 대상

| 값 | 브라우저 API | 변환 |
|---|---|---|
| `utcOffset` | `new Date().getTimezoneOffset()` | 분 단위 → 시간 단위 (부호 반전: `-540` → `9`) |
| `languageCode` | `navigator.language` | `ko-KR` → `ko` (앱에서 지원하는 locale만 필터) |

### 2. 흐름

```
1. 사용자가 /login 페이지에서 Google 로그인 버튼 클릭
2. OAuth 완료 → Auth.js 세션 생성 → 리다이렉트
3. 리다이렉트 대상 페이지(또는 공통 레이아웃)에서 클라이언트 훅 실행:
   a. getUserOption() 호출하여 기존 설정 존재 여부 확인
   b. 설정이 이미 있으면 → 아무것도 안 함
   c. 설정이 없으면 → 브라우저에서 utcOffset, locale 수집 → postUserOption() 호출
4. 이후 학습 페이지 정상 사용
```

### 3. 기존 설정 존재 여부 판별

현재 `getUserOption()`은 행이 없어도 기본값을 반환하므로 구분이 불가하다. 다음과 같이 변경한다:

- `getUserOption()`: 행이 없으면 **에러를 throw**한다. 자동 생성 로직이 있으므로, 정상 흐름에서 행이 없는 상황은 발생하지 않아야 한다. 행이 없다면 훅 실행 실패 등 비정상 상태를 의미한다.
- `hasUserOption(): Promise<boolean>`: 별도 추가. 클라이언트 훅(`useInitUserOption`)에서 설정 존재 여부를 확인하는 용도로 사용한다.

### 4. `dailyReviewWords`, `dailyStudyWords`는?

이 두 값은 브라우저에서 자동 수집할 수 없다. 서버 측 기본값(`20`, `10`)을 그대로 사용한다. 사용자가 나중에 settings 페이지에서 변경할 수 있다.

### 5. 변경 대상 파일

- `src/api/option.ts` — `getUserOption()`에서 행 없을 시 에러 throw, `hasUserOption()` 추가
- 신규 클라이언트 훅 (예: `src/hooks/useInitUserOption.ts`) — 브라우저 정보 수집 + 초기 설정 생성
- 공통 레이아웃 또는 적절한 위치에 훅 배치
- `src/app/[locale]/settings/page.tsx` — `getUserOption()`이 `null`을 반환하는 경우 처리

## Alternatives Considered

### 미들웨어에서 settings 페이지로 리다이렉트 (이전 Spring Boot 방식)

`has-settings` 쿠키를 도입하고, 설정이 없는 사용자를 middleware에서 `/settings`로 강제 리다이렉트하는 방식.

**장점**: 설정 완료를 강제할 수 있다.

**기각 사유**:
- `utcOffset`과 `locale`은 브라우저가 이미 알고 있는 값이므로, 사용자에게 수동 입력을 요구하는 것은 불필요한 마찰이다
- 쿠키와 DB 간 동기화 관리가 필요하다 (세팅/삭제/만료 등)
- middleware의 분기 복잡도가 증가한다

### Auth.js signIn 콜백에서 직접 생성

서버 사이드 콜백에서 `user_options`를 생성하는 방식.

**장점**: 클라이언트 훅 없이 서버에서 완결된다.

**기각 사유**:
- Auth.js 콜백은 서버에서 실행되므로 브라우저의 `timezone`과 `navigator.language`에 접근할 수 없다
- HTTP 헤더(`Accept-Language`, `CF-Timezone`)로 추정할 수는 있지만 정확도가 떨어진다

## Consequences

### Positive

- 최초 로그인 사용자가 설정 페이지를 거치지 않아도 올바른 `utcOffset`과 `languageCode`로 즉시 학습을 시작할 수 있다
- middleware 복잡도가 증가하지 않는다
- 쿠키-DB 동기화 같은 추가 상태 관리가 불필요하다

### Negative

- 브라우저 정보 기반이므로 100% 정확하지 않을 수 있다 (예: VPN 사용, 브라우저 언어 설정이 실제와 다른 경우). 하지만 사용자가 settings 페이지에서 언제든 수정 가능하므로 치명적이지 않다
- `getUserOption()`이 행이 없으면 에러를 throw하므로, 기존 호출부에서 에러 처리가 필요하다
- 클라이언트 훅이 실행되기 전 짧은 순간에는 설정이 없는 상태가 존재한다 (로딩 상태 처리 필요)

## References

- RFC-0005: Auth.js + D1 + Google OAuth
- RFC-0008: Server Actions + 직접 DB 접근
- `src/api/option.ts` — `getUserOption`, `postUserOption`
- `src/db/schema.ts:108` — `user_options` 테이블 스키마
- `src/app/[locale]/settings/page.tsx` — 현재 설정 페이지
- MDN: [`Date.getTimezoneOffset()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
- MDN: [`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language)
