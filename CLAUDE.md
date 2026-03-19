# CLAUDE.md

## Rules

### Deploy & Fix Workflow
- 배포 중 이슈를 만나면 **먼저 사용자에게 보고하고 수정 방향을 함께 결정**한 후 코드를 변경한다
- 독단적으로 코드를 수정하거나 push하지 않는다
- 논의 내용은 `docs/deploy-log/` 디렉토리에 기록한다

### Knowledge Debt Prevention
- 사용자가 프로젝트의 모든 변경 사항을 완전히 이해해야 한다
- 변경의 **이유(why)**와 **영향 범위**를 반드시 설명한다
- 기술 부채나 지식 부채가 생기지 않도록 한다
- 사용자가 개념을 충분히 이해하고 있는지 의심되면 확인 질문을 한다
- 간단한 확인은 인라인으로 처리한다
- 깊은 설명이 필요하면 에이전트를 분리하되, **충분한 맥락(이슈 배경, 변경 내용, 영향 범위)을 프롬프트에 포함**하여 전달한다
- 사용자가 새로운 개념을 학습한 경우 `~/obsidian-vault/learnings/`에 `templates/learning.md` 템플릿으로 기록한다

## Project

- Runtime: Next.js 16.1.x + @opennextjs/cloudflare
- Deploy: Cloudflare Workers (GitHub Actions)
- Package Manager: pnpm 10
