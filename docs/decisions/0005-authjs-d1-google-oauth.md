# RFC-0005: Auth.js v5 + D1 기반 Google OAuth 인증

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | Team |
| **Created** | 2026-03-19 |
| **Updated** | 2026-03-20 |

## Summary

기존 JWT 직접 구현 방식을 Auth.js v5로 전환하고, Google OAuth 소셜 로그인만 지원한다. 세션 저장소로 `@auth/d1-adapter`를 사용하여 Cloudflare D1에 세션을 저장한다.

## Context

RFC-0004에서 Spring Boot 백엔드를 제거하고 Cloudflare D1 기반으로 전환하기로 결정했다. 이에 따라 인증도 재구현이 필요하다.

- 기존에는 Google OAuth를 직접 구현하여 JWT를 발급하고 검증하는 방식이었다
- 서비스 대상이 외국인이므로 Google 계정이 가장 보편적이다. 카카오/네이버 등 한국 소셜 로그인은 불필요하다
- Next.js 16 + `@opennextjs/cloudflare` 환경에서 동작해야 한다
- Cloudflare가 공식 Developer Spotlight에서 Auth.js + D1 + `@opennextjs/cloudflare` 조합의 풀스택 인증 튜토리얼을 제공하고 있다
- `@auth/d1-adapter` 패키지가 공식 제공된다

## Decision

### 1. Auth.js v5 + Google Provider 채택

인증 라이브러리로 Auth.js(NextAuth) v5를 사용하고, Google OAuth만 provider로 설정한다.

- OAuth 플로우, 토큰 관리, 세션 처리를 직접 구현하지 않고 Auth.js에 위임한다
- 추후 provider 추가가 필요하면 설정만 추가하면 된다

### 2. D1 세션 저장 (database 전략)

`@auth/d1-adapter`를 사용하여 세션을 D1에 저장한다.

- Google OAuth provider + database 전략 조합은 정상 동작한다
- Auth.js가 요구하는 테이블(`users`, `accounts`, `sessions`, `verification_tokens`)은 adapter의 `up()` 함수로 마이그레이션한다

### 3. getCloudflareContext 비동기 패턴

D1 바인딩 접근을 위해 `NextAuth()`를 async 함수로 감싸는 패턴을 사용한다:

```ts
// src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const authResult = async () => {
  const { env } = await getCloudflareContext({ async: true });
  return NextAuth({
    providers: [Google],
    adapter: D1Adapter(env.DB),
  });
};

export const { handlers, signIn, signOut, auth } = await authResult();
```

### 4. jose v6 override

Auth.js가 내부적으로 사용하는 `jose` 라이브러리 v5는 Cloudflare Workers의 crypto API와 호환되지 않는다. pnpm overrides로 v6을 강제한다:

```json
{
  "pnpm": {
    "overrides": {
      "jose": "^6.0.0"
    }
  }
}
```

### 5. 기존 users 테이블과의 관계

RFC-0004에서 정의한 `users` 테이블(`id`, `external_id`, `created_at`)은 Auth.js가 생성하는 `users` 테이블과 역할이 겹친다. Auth.js의 `users` 테이블을 기본으로 사용하되, FSRS 학습 데이터(`user_cards`, `user_options`, `user_study_history`)는 Auth.js `users.id`를 FK로 참조하도록 스키마를 조정한다.

### 6. 로컬 개발 설정

`next.config.mjs`에 `initOpenNextCloudflareForDev()`를 추가하여 로컬에서 D1 바인딩을 에뮬레이션한다.

## Alternatives Considered

### 직접 OAuth 구현 유지

기존처럼 Google OAuth 플로우를 직접 구현하는 방법. 외부 의존성이 없고 동작을 완전히 제어할 수 있다. 그러나 토큰 갱신, 세션 관리, CSRF 보호 등을 직접 구현해야 하며, 보안 취약점이 발생할 여지가 있다. Auth.js는 이러한 부분을 검증된 방식으로 처리해 준다.

### Lucia Auth

경량 인증 라이브러리로 DB를 직접 제어할 수 있다. 그러나 2024년부터 maintenance mode에 들어갔으며 새로운 기능 개발이 중단되었다. 장기적으로 지원이 불확실하다.

### Clerk / Auth0

외부 인증 서비스를 사용하면 구현이 거의 불필요하다. 그러나 외부 서비스 의존성이 생기고, 무료 티어 제한이 있으며, D1에 직접 세션을 저장하는 것보다 레이턴시가 높다. Cloudflare Workers 환경의 이점(같은 인프라 내 DB 접근)을 살릴 수 없다.

## Consequences

### Positive

- OAuth 플로우, 세션 관리, CSRF 보호를 Auth.js가 처리하여 인증 관련 코드가 대폭 줄어든다
- Google 외 provider 추가가 설정 한 줄로 가능하다
- D1에 세션을 저장하므로 같은 인프라 내에서 인증이 완결된다
- Next.js와의 통합이 자연스럽다 (`auth()` 호출로 서버 컴포넌트에서 세션 확인)

### Negative

- `@opennextjs/cloudflare`가 아직 pre-1.0이라 Auth.js와의 조합에서 예상치 못한 edge case가 발생할 수 있다
- `jose` v6 override가 필요하며, Auth.js 업데이트 시 호환성을 재확인해야 한다
- Auth.js가 생성하는 테이블 구조(`users`, `accounts`, `sessions`)를 Auth.js 규약에 맞춰야 하므로, 커스텀 사용자 필드 추가 시 adapter 확장이 필요하다
- RFC-0004의 `users` 스키마를 Auth.js 호환으로 변경해야 한다

### Neutral

- 로컬 개발 시 `initOpenNextCloudflareForDev()` 설정이 필수지만, 이는 D1 바인딩 사용 시 이미 필요한 설정이다
- Next.js 16에서는 proxy.ts가 Node.js 런타임이므로 Edge 호환성 분리 패턴이 불필요하다

## References

- [Cloudflare Developer Spotlight: Auth.js + D1 튜토리얼](https://developers.cloudflare.com/developer-spotlight/tutorials/authjs-d1-nextjs/)
- [Auth.js v5 공식 문서](https://authjs.dev/)
- [@auth/d1-adapter](https://authjs.dev/getting-started/adapters/d1)
- [jose v6 Cloudflare Workers 호환](https://github.com/panva/jose/releases/tag/v6.0.0)
- [getCloudflareContext async 옵션](https://opennext.js.org/cloudflare)
- RFC-0004: D1 + Drizzle 기반 백엔드 재설계
