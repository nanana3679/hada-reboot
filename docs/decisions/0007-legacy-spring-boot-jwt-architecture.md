# RFC-0007: 이전 아키텍처 기록 — Spring Boot + JWT 인증

| 항목 | 내용 |
|------|------|
| **Status** | superseded |
| **Author** | Team |
| **Created** | 2026-03-21 |
| **Updated** | 2026-03-21 |
| **Superseded by** | RFC-0004 (백엔드 전환), RFC-0005 (인증 전환) |

## Summary

HADA의 초기 아키텍처를 기록한다. Next.js 프론트엔드가 외부 Spring Boot 서버에 JWT 인증으로 API를 호출하는 구조였다. RFC-0004, RFC-0005에 의해 대체되었으며, 이 문서는 이전 구조의 동작 방식과 문제점을 보존하기 위해 작성한다.

## Context

이 문서는 의사결정이 아니라, RFC-0004/0005의 결정 배경을 이해하기 위한 기존 구조 기록이다.

## 이전 아키텍처 상세

### 전체 구조

```
브라우저 → Next.js (Cloudflare Workers) → Spring Boot API (별도 서버)
                    ↓
           HttpClient (axios)
                    ↓
           AuthInterceptor → JWT 토큰 주입
                    ↓
           Spring Boot → Google OAuth + JWT 발급/검증
```

Next.js는 UI 렌더링만 담당하고, 모든 데이터 조회/저장은 Spring Boot 서버의 REST API를 호출했다.

### 인증 흐름

1. **로그인**: 사용자가 Google OAuth로 로그인하면, Spring Boot가 JWT(access token + refresh token)를 발급
2. **토큰 저장**: `CookieService`가 httpOnly 쿠키에 두 토큰을 저장
3. **API 호출**: `HttpClient`(axios 래퍼)가 요청을 보내기 전, `AuthInterceptor`가 `Authorization: Bearer <accessToken>` 헤더를 주입
4. **토큰 갱신**: `AuthService`가 만료 5분 전에 proactive하게 refresh token으로 새 토큰을 요청
5. **401 에러**: 만료된 토큰으로 요청이 실패하면, `AuthInterceptor`의 에러 핸들러가 `AuthService.refresh()`를 호출하여 토큰을 갱신 후 원래 요청을 재시도

### 구성 요소 (`src/services/`)

| 파일 | 역할 |
|------|------|
| `HttpClient.ts` | axios 인스턴스 래퍼. baseURL, 5초 타임아웃, JSON 헤더 설정. GET/POST/PUT/DELETE 메서드 제공 |
| `AuthInterceptor.ts` | axios 요청 인터셉터(토큰 주입), 응답 인터셉터(401시 토큰 갱신) |
| `AuthService.ts` | 토큰 유효성 검사, 자동 갱신, 로그인 상태 확인 |
| `CookieService.ts` | Next.js `cookies()` API로 토큰 쿠키 관리 |
| `ServerServiceFactory.ts` | 위 서비스들의 싱글톤 팩토리 |

### API 클라이언트 (`src/api/`)

각 도메인별로 API 호출 함수를 정의:

```typescript
// src/api/decks.ts
const httpClient = ServerServiceFactory.getHttpClient();

export const getDecks = async (categoryType: CategoryType) => {
  const url = `/decks?queryType=${normalizeQuery(categoryType)}`;
  const response = await httpClient.get<Paginated<Deck>>(url);
  return response.data;
};
```

Spring Boot 서버의 URL 규칙에 맞추기 위해 `normalizeQuery()` 같은 변환 유틸리티가 필요했다 (difficulty → LEVEL, meaning → TOPIC 등).

## 이 구조의 문제점

### 1. 이중 서버 운영 비용

Next.js는 Cloudflare Workers에 무료 배포 가능하지만, Spring Boot는 별도 서버가 필요하다. 단어 조회와 FSRS 학습 저장 정도의 기능에 비해 운영 부담이 크다.

### 2. 인증 복잡도

5개 서비스 클래스(HttpClient, AuthInterceptor, AuthService, CookieService, ServerServiceFactory)가 JWT 관리를 위해 존재했다. `auth.ts`에서 refresh token 갱신 시 HttpClient 대신 native `fetch`를 쓰는 것은 순환 참조를 회피하기 위한 우회였다.

### 3. 프론트엔드-백엔드 간 번역 레이어

Spring Boot API의 URL/파라미터 규칙이 프론트엔드와 달라서 `normalizeQuery`, `getCategoryType` 같은 변환 함수가 필요했다. API 스펙 변경 시 양쪽을 동기화해야 했다.

### 4. 데이터 왕복

58,000개 단어 데이터가 CSV로 이미 확보되어 있음에도, Spring Boot 서버를 통해서만 조회할 수 있었다. 네트워크 지연이 불필요하게 추가되었다.

## References

- RFC-0004: D1 + Drizzle 백엔드 재설계 — 이 구조를 대체한 결정
- RFC-0005: Auth.js v5 + D1 Google OAuth — JWT 인증을 대체한 결정
- `src/services/` — 이전 서비스 레이어 (삭제 예정)
- `src/utils/converter.ts` — normalizeQuery 등 변환 유틸리티 (삭제 예정)
