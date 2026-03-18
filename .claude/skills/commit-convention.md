---
name: commit-convention
description: Enforces Korean git commit conventions whenever creating commits, staging changes, or the user asks to commit. Applies to any git commit operation — even if the user just says "commit this" or "save my changes" without mentioning conventions.
---

## Format

```
type: 설명
```

## Types

- `feat` — 새로운 기능 추가
- `fix` — 버그 수정
- `refactor` — 동작 변경 없는 코드 구조 개선
- `style` — 포맷, 세미콜론 등 코드 스타일만 변경
- `docs` — 문서 변경
- `chore` — 빌드, 설정, 패키지 등 코드 외 변경
- `test` — 테스트 추가 또는 수정

## Rules

Write commit messages in Korean using imperative form ("추가", "수정", "변경"). Keep the subject line under 50 characters — this ensures readability in `git log --oneline` and GitHub's commit list.

Stage only related changes together into a single commit. Each commit should have exactly one purpose. If you changed both a config file and a feature component for unrelated reasons, split them into separate commits. This keeps `git bisect` and `git revert` useful.

## Examples

**Example 1:**
Changes: 새로운 단어 상세 페이지 컴포넌트와 라우트 추가
Output: `feat: 단어 상세 페이지 추가`

**Example 2:**
Changes: 로그인 시 만료된 토큰이 갱신되지 않는 버그 수정
Output: `fix: 로그인 토큰 만료 처리 수정`

**Example 3:**
Changes: package-lock.json 삭제, pnpm-lock.yaml 생성, README의 npm → pnpm 변경
Output: `chore: pnpm으로 패키지 매니저 변경`
