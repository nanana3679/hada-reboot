---
name: ship
description: "격리된 worktree에서 기능 구현 → 테스트 → PR → 리뷰 → 머지 → 학습 기록까지 자동화. 'ship', '/ship', '기능 구현해줘', 'PR까지 만들어줘', '이거 처리해줘' 등의 요청에 사용."
aliases: [sp]
context: fork
agent: ship-orchestrator
---

## Task

$ARGUMENTS

## Context

ship-orchestrator에게 위 태스크를 전달합니다.
오케스트레이터는 전문 서브에이전트를 순차적으로 호출하여 작업을 완수합니다.
학습 기록이 있으면 .ship/learnings.jsonl을 참고합니다.
