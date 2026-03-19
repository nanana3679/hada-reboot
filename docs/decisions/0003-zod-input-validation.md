# RFC-0003: Zod를 활용한 API 입력 검증 및 타입 통합

| 항목 | 내용 |
|------|------|
| **Status** | proposed |
| **Author** | Team |
| **Created** | 2026-03-19 |
| **Updated** | 2026-03-19 |

## Summary

API Routes의 요청 검증에 Zod를 도입하여 런타임 검증과 TypeScript 타입을 단일 스키마로 통합한다.

## Context

현재 API Routes에서 입력 검증은 수동 조건문으로 처리하고 있다:

```typescript
// src/app/api/auth/login/route.ts
const { email, password } = await req.json();
if (!email || !password) {
  return Response.json({ error: 'Email and password required' }, { status: 400 });
}
```

이 방식의 문제:

1. **검증 누락 위험** — 필드 추가 시 검증 코드를 빠뜨릴 수 있다. `/api/review`의 body에는 9개 필드가 있지만 `cardId`만 검사하고 나머지는 검증하지 않는다
2. **타입 이중 관리** — API 요청/응답의 TypeScript 타입(`interface`)과 런타임 검증 로직을 별도로 유지해야 한다
3. **에러 메시지 불일치** — 엔드포인트마다 에러 형식이 다르다 (`'Email and password required'` vs `'cardId required'` vs `'No fields to update'`)

## Decision

Zod를 도입하여 API 입력 검증과 TypeScript 타입 정의를 통합한다.

### 1. 스키마 정의

`src/lib/schemas.ts`에 API별 요청 스키마를 정의한다:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const reviewSchema = z.object({
  cardId: z.number().int().positive(),
  stability: z.number().default(0),
  difficulty: z.number().default(0),
  due: z.string().nullable().default(null),
  lastReview: z.string().nullable().default(null),
  reps: z.number().int().default(0),
  lapses: z.number().int().default(0),
  elapsedDays: z.number().int().default(0),
  scheduledDays: z.number().int().default(0),
  state: z.number().int().default(0),
});

export const settingsSchema = z.object({
  language: z.string().optional(),
  dailyNewCards: z.number().int().positive().optional(),
  dayStartHour: z.number().int().min(0).max(23).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field required',
});

// TypeScript 타입은 스키마에서 자동 추론
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
```

### 2. 공통 파싱 헬퍼

`src/lib/api-utils.ts`에 검증 헬퍼를 추가한다:

```typescript
import { ZodSchema, ZodError } from 'zod';

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T | Response> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
```

### 3. API Route에서의 사용

```typescript
// before
const { email, password } = await req.json();
if (!email || !password) {
  return Response.json({ error: 'Email and password required' }, { status: 400 });
}

// after
const result = await parseBody(req, loginSchema);
if (result instanceof Response) return result;
const { email, password } = result;
```

### 4. 적용 범위

POST/PATCH 요청이 있는 엔드포인트에만 적용한다:

| 엔드포인트 | 스키마 |
|-----------|--------|
| `POST /api/auth/login` | `loginSchema` |
| `POST /api/auth/register` | `registerSchema` |
| `POST /api/review` | `reviewSchema` |
| `PATCH /api/settings` | `settingsSchema` |

GET 엔드포인트의 query parameter는 Zod를 적용하지 않는다. 문자열 파싱이 주이고 검증 항목이 적어 수동 처리로 충분하다.

## Alternatives Considered

### 수동 검증 유지

현재 방식을 계속 사용한다. 엔드포인트가 9개로 적고 1인 프로젝트이므로 관리 가능하다. 그러나 `/api/review`처럼 필드가 많은 엔드포인트에서 검증 누락이 이미 발생하고 있어, 엔드포인트가 추가될수록 리스크가 커진다.

### Valibot

Zod보다 번들 크기가 작다 (~5KB vs ~14KB). 그러나 생태계와 문서가 Zod에 비해 부족하고, tree-shaking 이점은 서버 사이드(Edge Runtime)에서는 크지 않다. Zod의 범용성과 익숙함을 우선한다.

## Consequences

### Positive

- 검증 로직과 TypeScript 타입이 단일 소스에서 관리된다
- 에러 응답 형식이 통일된다 (`{ error, details }`)
- 기본값(`default`)을 스키마에서 선언하여 API Route 코드가 간결해진다
- `/api/review`의 9개 필드처럼 복잡한 body도 안전하게 검증된다

### Negative

- Zod 의존성 추가 (~14KB min+gzip). Edge Runtime 콜드 스타트에 미미한 영향 가능
- 팀원(또는 미래의 기여자)이 Zod 문법을 알아야 한다

## References

- [Zod 공식 문서](https://zod.dev)
- [Valibot](https://valibot.dev) — 검토한 대안
- RFC-0001: API 엔드포인트 설계
