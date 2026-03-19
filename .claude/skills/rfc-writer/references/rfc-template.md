# RFC Template

아래 템플릿을 복사하여 새 RFC를 작성한다. `{중괄호}` 안의 내용을 실제 값으로 대체하고, 불필요한 안내 주석(`<!-- -->`)은 제거한다.

---

```markdown
# RFC-{NNNN}: {제목}

| 항목 | 내용 |
|------|------|
| **Status** | {proposed / accepted / rejected / deprecated / superseded} |
| **Author** | {작성자 또는 "Team"} |
| **Created** | {YYYY-MM-DD} |
| **Updated** | {YYYY-MM-DD} |
| **Supersedes** | {대체하는 RFC 번호. 없으면 이 행 삭제} |
| **Superseded by** | {이 RFC를 대체한 RFC 번호. 없으면 이 행 삭제} |

## Summary

<!-- 1~3문장으로 이 RFC가 제안하는 결정을 요약한다. -->

{이 RFC의 핵심 결정을 1~3문장으로 요약}

## Context

<!--
  이 결정이 필요한 배경을 서술한다.
  - 현재 상태와 문제점
  - 기술적·비즈니스적 제약 조건
  - 관련 요구사항이나 이슈
  가치 중립적으로 사실만 기술한다. "X가 나쁘다"가 아니라 "X는 Y 문제를 야기한다"로 쓴다.
-->

{배경 서술}

## Decision

<!--
  결정 내용을 능동태로 명확하게 기술한다.
  "우리는 ~를 채택한다", "~를 사용하기로 한다" 형식을 권장한다.
  필요하다면 결정의 범위(scope)도 명시한다.
-->

{결정 내용}

## Alternatives Considered

<!--
  검토했지만 채택하지 않은 대안을 기술한다.
  각 대안에 대해:
  1. 대안의 개요
  2. 장점
  3. 채택하지 않은 이유
  최소 1개 이상의 대안을 기술한다.
-->

### {대안 1 이름}

{개요, 장점, 기각 사유}

### {대안 2 이름}

{개요, 장점, 기각 사유}

## Consequences

<!--
  이 결정으로 인한 결과를 기술한다.
  긍정적·부정적·중립적 결과를 모두 포함한다.
  "장점"만 나열하지 않는다 — 트레이드오프를 정직하게 기록하는 것이 RFC의 핵심 가치다.
-->

### Positive

{긍정적 결과}

### Negative

{부정적 결과 또는 감수해야 할 트레이드오프}

### Neutral

{중립적 변화. 없으면 이 섹션 삭제 가능}

## References

<!-- 관련 이슈, PR, 외부 문서, 벤치마크 결과 등 -->

- {관련 링크 1}
- {관련 링크 2}
```

---

## 작성 예시 (간략)

아래는 완성된 RFC의 예시다. 실제 RFC도 이 정도의 구체성을 갖추어야 한다.

```markdown
# RFC-0001: Next.js App Router 채택

| 항목 | 내용 |
|------|------|
| **Status** | accepted |
| **Author** | Frontend Team |
| **Created** | 2025-03-15 |
| **Updated** | 2025-03-19 |

## Summary

신규 프로젝트의 라우팅 시스템으로 Next.js App Router를 채택한다. Pages Router 대신 App Router를 선택하여 React Server Components, Streaming, Nested Layouts 등의 기능을 활용한다.

## Context

우리 팀은 새로운 B2B SaaS 대시보드를 구축할 예정이다. 주요 요구사항은 다음과 같다:

- 페이지별 레이아웃이 다르고 중첩 구조가 필요하다
- 초기 로딩 성능이 핵심 지표다 (LCP 2.5s 이하 목표)
- 팀원 4명 중 3명이 Next.js Pages Router 경험이 있다
- React 19의 Server Components를 활용하고 싶다는 팀 합의가 있다

현재 Next.js는 App Router를 기본 라우터로 권장하고 있으며, 새로운 기능은 App Router에만 추가되고 있다.

## Decision

Next.js 15의 App Router를 사용하기로 한다. 구체적으로:

- `src/app/` 디렉토리를 라우팅 루트로 사용한다
- 페이지 컴포넌트는 기본적으로 Server Component로 작성한다
- 클라이언트 인터렉션이 필요한 부분만 `'use client'`를 선언한다
- 레이아웃 중첩을 적극 활용하여 공통 UI를 layout.tsx로 분리한다

## Alternatives Considered

### Pages Router 유지

Pages Router는 팀에 익숙하고 안정적이다. 그러나 중첩 레이아웃 구현이 번거롭고, Server Components를 사용할 수 없다. Next.js 공식 문서에서도 신규 프로젝트에는 App Router를 권장하고 있어, 장기적으로 Pages Router에 투자하는 것은 리스크가 있다.

### Remix

Remix는 nested routing과 서버 렌더링에서 훌륭한 설계를 가지고 있다. 그러나 팀의 Next.js 경험을 활용할 수 없고, Vercel 배포 파이프라인과의 통합이 추가 작업을 필요로 한다. 학습 곡선 대비 얻는 이점이 크지 않다고 판단했다.

## Consequences

### Positive

- React Server Components를 활용한 번들 크기 감소와 초기 로딩 성능 개선
- 중첩 레이아웃을 파일 시스템 기반으로 자연스럽게 구성 가능
- Streaming SSR을 통한 점진적 페이지 렌더링
- Next.js의 미래 기능을 즉시 활용 가능

### Negative

- 팀원 전원이 App Router 학습 시간이 필요하다 (약 1~2주 추정)
- App Router의 캐싱 동작이 Pages Router와 다르며, 디버깅이 복잡할 수 있다
- 일부 서드파티 라이브러리가 아직 Server Components를 완전히 지원하지 않는다

## References

- [Next.js App Router 공식 문서](https://nextjs.org/docs/app)
- [팀 내부 논의 이슈 #142](https://github.com/our-org/project/issues/142)
```
