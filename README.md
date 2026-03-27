# HADA (하다)

외국인을 위한 한국어 단어 학습 웹 애플리케이션.
58,000+ 한국어 단어를 FSRS(Free Spaced Repetition Scheduler) 알고리즘으로 학습하고, 최적 복습 시점을 자동 스케줄링합니다.

## 주요 기능

- **FSRS 간격 반복 학습** — stability, difficulty 파라미터 기반 카드별 최적 복습 시점 자동 스케줄링
- **카테고리별 덱 관리** — 초급/중급/고급 난이도 + 27개 주제, 총 30개 카테고리
- **다국어 지원** — 11개 언어 UI (영어, 일본어, 중국어, 스페인어, 프랑스어, 러시아어, 아랍어, 태국어, 베트남어, 인도네시아어, 몽골어)
- **단어 상세 정보** — 발음, 품사, 활용형, 예문, 다국어 번역
- **학습 진도 관리** — 일일 학습/복습 목표 설정, 진행률 추적
- **테마 지원** — Light/Dark 모드 (일반/중간/고대비)

## 배경

기존 [HADA](https://github.com/donghyoya/HADA) 팀 프로젝트(Spring Boot + Next.js)를 서버리스 단일 스택으로 마이그레이션한 개인 프로젝트입니다.

## 주요 구현 사항

- Spring Boot + Next.js 이중 서버 구조에서 배포·모니터링 이중 관리 및 네트워크 지연 발생 → Cloudflare Workers 단일 스택으로 마이그레이션하여 서버 운영 비용 0원 달성
- Server Action에서 자체 API Route를 fetch하는 구조에서 불필요한 HTTP 왕복 발생 → Server Actions에서 D1 직접 접근으로 전환, 직렬화 레이어 제거
- 58,000건 × 11개 언어 번역 데이터 설계 시 단일 테이블 22개 컬럼 비대화 → translations(word_id, lang_code) 테이블 분리로 확장 구조 확보
- Prisma 번들 ~400KB로 Workers 번들 제한에 부담 → Drizzle ORM 채택으로 번들 크기 약 87% 감소 (~50KB)
- 카테고리별 58,000건 집계를 매 요청마다 실행하면 D1 무료 티어 읽기 한도 소진 위험 → KV 캐싱 도입 (글로벌/유저별 분리, 학습 시 선택 무효화)
- JWT 직접 구현의 보안 취약점 위험 (XSS, CSRF) → Auth.js v5 + D1 Adapter, HttpOnly 쿠키 기반 세션으로 전환하여 보안 강화

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **State** | Redux + TanStack Query |
| **Styling** | SCSS Modules + Material Web Components (@lit/react) |
| **i18n** | next-intl (11개 언어) |
| **Animation** | Motion |
| **Algorithm** | ts-fsrs (FSRS 간격 반복) |
| **ORM** | Drizzle ORM |
| **DB** | Cloudflare D1 (SQLite) + KV |
| **Auth** | Auth.js v5 + Google OAuth |
| **Deploy** | Cloudflare Workers (GitHub Actions) |

## 시작하기

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 프로젝트 구조

```
src/
├── api/           # Server Actions (D1 직접 접근)
├── app/
│   ├── api/auth/  # Auth.js Route Handler
│   └── [locale]/  # 다국어 라우팅
│       ├── card/[cardId]/          # 단어 상세
│       ├── decks/                  # 덱 목록
│       ├── learning/[category]/    # 학습 화면
│       ├── login/                  # 로그인
│       └── settings/              # 설정
├── components/    # UI 컴포넌트 (Material Web Components + 커스텀)
├── db/            # Drizzle ORM 스키마
├── hooks/         # 커스텀 훅 (useStudyQueue, useCardDetailCache 등)
├── i18n/          # 국제화 설정
├── services/      # 비즈니스 로직 (StudyService)
├── store/         # Redux 스토어
├── styles/        # SCSS, MD3 테마 토큰
└── types/         # TypeScript 타입 정의
```

## 아키텍처 의사결정

주요 기술 결정은 RFC 문서로 기록되어 있습니다.

| RFC | 제목 |
|-----|------|
| [RFC-0004](docs/decisions/0004-d1-drizzle-backend-redesign.md) | D1 + Drizzle 기반 백엔드 재설계 |
| [RFC-0005](docs/decisions/0005-authjs-d1-google-oauth.md) | Auth.js v5 + D1 기반 Google OAuth 인증 |
| [RFC-0006](docs/decisions/0006-domain-naming-conventions.md) | 도메인 네이밍 컨벤션 |
| [RFC-0008](docs/decisions/0008-server-actions-direct-db-access.md) | Server Actions + 직접 DB 접근 전환 |
