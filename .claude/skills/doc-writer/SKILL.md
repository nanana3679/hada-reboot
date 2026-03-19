---
name: doc-writer
description: "프로젝트 문서화 3계층(Decision → Spec → Test)을 체계적으로 작성하는 스킬. '문서 작성', '스펙 작성', 'spec 써줘', '기능 명세', '문서화해줘', 'document this', '스펙 문서', '기능 정의서' 등을 요청할 때 이 스킬을 사용한다. RFC만 단독으로 요청하는 경우에는 rfc-writer 스킬을 사용하고, 전체 문서화 또는 스펙 작성이 필요한 경우에 이 스킬을 트리거한다."
---

# Doc Writer — 3계층 문서화 에이전트

프로젝트의 기능을 **왜(Why) → 무엇(What) → 어떻게(How)** 3계층으로 체계적으로 문서화하는 스킬.

## 문서화 3계층 구조

```
docs/
├── decisions/          ← 왜 이 선택을 했는가 (RFC)
│   └── 0001-xxx.md        "할인은 중첩 방식으로 적용하기로 한다"
├── specs/              ← 무엇을 만드는가 (큰 그림)
│   └── discount-system.md "할인 시스템은 쿠폰, 등급, 프로모션 3종을 지원한다"
└── (테스트 코드)        ← 정확히 어떻게 동작하는가 (엣지케이스 포함)
    └── src/**/*.test.ts   코드로 표현된 동작 명세
```

### 계층별 역할

| 계층 | 위치 | 질문 | 독자 | 수명 |
|------|------|------|------|------|
| **Decision (RFC)** | `docs/decisions/` | 왜 이렇게 했나? | 미래의 개발자 | 영구 (변경 시 supersede) |
| **Spec** | `docs/specs/` | 무엇을 만드나? | 현재 구현자 | 기능 수명과 동일 |
| **Test** | `src/**/*.test.ts` | 정확히 어떻게 동작하나? | 코드와 CI | 코드 수명과 동일 |

## 워크플로우

### 1단계: 문서화 범위 결정

사용자의 요청을 분석하여 어떤 계층이 필요한지 판단한다:

- **새로운 기술 선택/아키텍처 결정** → Decision + Spec + Test (3계층 모두)
- **새로운 기능 구현** → Spec + Test (2계층)
- **기존 기능의 동작 명세** → Spec + Test 또는 Test만
- **기술적 의사결정 기록** → Decision만 (→ rfc-writer 스킬에 위임)

사용자에게 어떤 계층을 작성할지 확인한다. 확인 없이 추측하지 않는다.

### 2단계: Decision (RFC) 작성

기술적 의사결정이 포함된 경우, 기존 `rfc-writer` 스킬의 워크플로우를 따른다:

- 경로: `docs/decisions/{NNNN}-{kebab-case}.md`
- 기존 RFC 번호 확인 후 다음 시퀀스 할당
- `references/rfc-template.md`는 rfc-writer 스킬의 것을 참조

### 3단계: Spec 작성

기능 명세를 `docs/specs/`에 작성한다:

- 경로: `docs/specs/{kebab-case-기능명}.md`
- `references/spec-template.md` 템플릿을 기반으로 작성
- 필요하다면 `docs/specs/` 디렉토리를 함께 생성

**Spec 작성 원칙:**

1. **범위를 명확히 한다** — "이 스펙이 다루는 것"과 "다루지 않는 것"을 구분
2. **용어를 정의한다** — 도메인 특화 용어는 Glossary 섹션에서 정의
3. **시나리오로 설명한다** — 추상적 설명보다 구체적 시나리오가 낫다
4. **엣지케이스를 명시한다** — "~하면 어떻게 되는가?" 질문에 답한다
5. **RFC를 참조한다** — 관련 Decision이 있으면 반드시 링크

### 4단계: Test 코드 가이드 작성

Spec의 시나리오와 엣지케이스를 기반으로 테스트 코드 구조를 제안한다:

- 프로젝트의 기존 테스트 컨벤션을 먼저 확인한다
- `describe` 블록은 Spec의 시나리오와 1:1 대응시킨다
- 엣지케이스는 별도 `describe('Edge Cases', ...)` 블록으로 분리

```typescript
// Spec 시나리오 → Test 매핑 예시
describe('할인 시스템', () => {
  describe('쿠폰 할인', () => {
    it('유효한 쿠폰 코드로 정률 할인이 적용된다', () => { ... });
    it('만료된 쿠폰은 할인이 적용되지 않는다', () => { ... });
  });

  describe('할인 중첩', () => {
    it('쿠폰 + 등급 할인은 곱셈으로 중첩된다', () => { ... });
    // ↑ Decision RFC-0005에서 "중첩 방식"으로 결정
  });

  describe('Edge Cases', () => {
    it('할인 합계가 100%를 초과하면 0원으로 처리한다', () => { ... });
  });
});
```

### 5단계: 문서 간 상호 참조

작성한 문서들 사이에 참조 링크를 추가한다:

- **Spec → Decision**: "이 설계의 배경은 [RFC-0005](../decisions/0005-discount-nesting.md)를 참고"
- **Spec → Test**: "동작 상세는 `src/lib/__tests__/discount.test.ts`를 참고"
- **Decision → Spec**: References 섹션에 관련 Spec 링크 추가

## 파일 구조 컨벤션

### `docs/decisions/` (기존 rfc-writer와 동일)

```
{4자리 시퀀스}-{kebab-case}.md
예: 0003-zod-input-validation.md
```

### `docs/specs/`

```
{kebab-case-기능명}.md
예: discount-system.md, card-review-flow.md
```

네이밍 규칙:
- 시퀀스 번호를 사용하지 않는다 (Spec은 RFC와 달리 기능명으로 식별)
- 기능 단위로 1파일을 유지한다
- 하위 기능이 커지면 디렉토리로 분리: `docs/specs/discount/coupon.md`

## 작성 스타일 가이드

- RFC와 동일하게 한국어 본문 + 영어 섹션 제목
- 기술 용어는 원어 그대로 사용
- Spec은 RFC보다 구체적이어야 한다 — 데이터 구조, API 시그니처, 상태 전이를 포함
- 테스트 코드의 `it` 설명은 한국어로 작성하여 Spec과 대응시킨다
- 분량: Spec은 100~300줄 권장. 길어지면 분리를 고려

## 언제 어떤 문서를 업데이트하는가

| 변경 유형 | Decision | Spec | Test |
|-----------|----------|------|------|
| 기술 선택 변경 | 새 RFC 작성 (기존은 supersede) | 영향받는 Spec 업데이트 | 영향받는 테스트 수정 |
| 기능 추가 | 필요시 RFC 추가 | 신규 Spec 작성 | 신규 테스트 작성 |
| 기능 수정 | - | Spec 업데이트 | 테스트 업데이트 |
| 버그 수정 | - | 엣지케이스 추가 (필요시) | 회귀 테스트 추가 |
| 기능 삭제 | - | Spec에 deprecated 표시 | 테스트 삭제 |

## 참고 자료

- `references/spec-template.md` — Spec 작성용 Markdown 템플릿
- `../rfc-writer/references/rfc-template.md` — RFC 작성용 템플릿 (Decision 계층)
