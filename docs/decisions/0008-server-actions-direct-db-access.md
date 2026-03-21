# RFC-0008: API 클라이언트를 Server Actions + 직접 DB 접근으로 전환

| 항목 | 내용 |
|------|------|
| **Status** | proposed |
| **Author** | nanana3679 |
| **Created** | 2026-03-21 |
| **Updated** | 2026-03-21 |

## Summary

프론트엔드의 API 클라이언트(`src/api/*.ts`)가 `fetch('/api/...')`로 자체 route.ts를 호출하는 구조를 제거하고, Server Actions에서 D1을 직접 조회하도록 전환한다.

## Context

RFC-0004에서 Spring Boot를 제거하고 Next.js API Routes로 전환했다. 이 과정에서 `src/api/*.ts`의 호출 대상만 Spring Boot → `/api/...` route.ts로 바꿨지만, **같은 서버 안에서 HTTP로 자기 자신을 호출하는 구조**가 그대로 남았다.

```
현재: 클라이언트 컴포넌트 → src/api/decks.ts ('use server' + fetch('/api/decks')) → route.ts → D1
```

이 구조에는 다음 문제가 있다:

1. **`'use server'` + 상대 URL 충돌**: Server Action은 서버에서 실행되므로 브라우저 컨텍스트가 없어 `/api/decks` 같은 상대 URL을 해석할 수 없다. 런타임에 `TypeError: Failed to parse URL` 발생
2. **불필요한 HTTP 왕복**: 같은 Workers 프로세스 안에서 HTTP 요청을 보내고 받는 것은 직렬화/역직렬화 오버헤드만 추가
3. **이중 레이어**: route.ts가 HTTP 파싱(쿼리 파라미터, JSON body) → DB 조회 → JSON 응답을 하고, Server Action이 다시 JSON을 파싱하는 불필요한 변환 계층

## Decision

`src/api/*.ts`의 Server Actions에서 `getDb()`를 직접 호출하여 D1에 접근한다.

1. **Server Actions**: route.ts의 DB 쿼리 로직을 `src/api/*.ts`로 이동. `fetch()` 호출 제거
2. **route.ts 삭제**: 프론트엔드에서만 사용하는 API이므로 route.ts를 전부 삭제한다. 외부 API가 필요해지면 그때 다시 만든다
3. **KV 캐싱**: 캐싱 로직을 Server Action에서 직접 KV에 접근하여 적용 (`getCloudflareContext()`로 바인딩 접근 가능)

```
변경 후: 클라이언트 컴포넌트 → src/api/decks.ts ('use server' + getDb() 직접 호출) → D1
```

## Alternatives Considered

### 절대 URL 사용 (BASE_URL 환경변수)

`fetch('/api/decks')` → `fetch('${BASE_URL}/api/decks')`로 변경하는 방안. 상대 URL 문제는 해결되지만 불필요한 HTTP 왕복과 이중 레이어 문제는 그대로 남는다. 근본적 해결이 아니라 우회에 불과하다.

### route.ts 유지

route.ts를 삭제하지 않고 남겨두는 방안. 외부 API 접근이 필요해질 경우를 대비할 수 있다. 그러나 현재 사용되지 않는 코드가 남아있으면 혼란을 주고, Server Action과 중복된 로직을 유지보수해야 한다. YAGNI 원칙에 따라 삭제한다.

## Consequences

### Positive

- `'use server'` + 상대 URL 런타임 오류 해소
- HTTP 직렬화/역직렬화 오버헤드 제거
- 타입 안전성 향상 — DB 쿼리 결과를 직접 반환하므로 JSON 변환 과정에서 타입이 유실되지 않음
- KV 캐싱을 Server Action에서 직접 적용 가능

### Negative

- 외부에서 HTTP로 접근할 수 있는 API 엔드포인트가 사라짐. 필요해지면 다시 만들어야 함
- Server Actions는 POST 요청으로 내부 RPC 형태이므로, curl 등으로 직접 테스트하기 어려움

## References

- RFC-0004: D1 + Drizzle 백엔드 재설계
- RFC-0007: 이전 Spring Boot + JWT 아키텍처 기록
- [Next.js Server Actions 문서](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- `src/api/decks.ts`, `src/api/study.ts` — 현재 API 클라이언트
