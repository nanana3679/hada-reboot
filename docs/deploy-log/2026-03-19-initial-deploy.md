# 2026-03-19 초기 Cloudflare Workers 배포

## Issue 1: pnpm 버전 불일치
- **증상**: GitHub Actions에서 `pnpm store path` 실패
- **원인**: 워크플로우에 pnpm 9로 설정, 프로젝트는 pnpm 10 사용
- **해결**: pnpm 버전 9 -> 10 수정

## Issue 2: framer-motion import
- **증상**: 빌드 실패 — `Can't resolve 'framer-motion'`
- **원인**: `motion` 패키지로 변경되었으나 import가 안 바뀜
- **해결**: `import { motion } from 'framer-motion'` -> `'motion/react'`

## Issue 3: ErrorFallback TypeScript 에러
- **증상**: `'error' is of type 'unknown'`
- **원인**: `FallbackProps`의 `error`가 `unknown` 타입
- **해결**: `error instanceof Error ? error.message : String(error)` 타입 가드 추가

## Issue 4: Next.js 16.2.0 + @opennextjs/cloudflare 호환 버그
- **증상**: `Error 1101` — `Unexpected loadManifest(/.next/server/prefetch-hints.json) call!`
- **원인**: @opennextjs/cloudflare#1157 — Next.js 16.2.0의 새 매니페스트 미지원
- **해결**: Next.js 16.2.0 -> 16.1.7 다운그레이드

## Issue 5: createPortal SSR 에러
- **증상**: `ReferenceError: document is not defined`
- **원인**: SnackbarProvider, TooltipProvider에서 `createPortal(... , document.body)` 직접 호출
- **해결**: `typeof document !== 'undefined'` 가드 추가
