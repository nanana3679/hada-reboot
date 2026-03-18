# HADA (하다)

외국인을 위한 한국어 단어 학습 웹 애플리케이션.
FSRS(Free Spaced Repetition Scheduler) 알고리즘 기반의 간격 반복 학습으로 효율적인 한국어 어휘 암기를 지원합니다.

## 프로젝트 목적

기존 [HADA](https://github.com/donghyoya/HADA) 프로젝트의 프론트엔드를 분리하여, Cloudflare Pages 기반 서버리스 아키텍처로 재구성합니다.

### 기존 vs Reboot

| | 기존 HADA | HADA Reboot |
|---|---|---|
| 구조 | Spring Boot + Next.js 모노레포 | Next.js 단일 프로젝트 |
| 배포 | 서버 기반 | Cloudflare Pages (서버리스) |
| 백엔드 | Spring Boot REST API | Cloudflare Workers / 외부 API |

## 주요 기능

- **간격 반복 학습** - FSRS 알고리즘 기반 스마트 복습 스케줄링
- **난이도별/주제별 분류** - 초급/중급/고급 난이도, 27개 주제 카테고리
- **다국어 지원** - 11개 언어 UI (한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 러시아어, 아랍어, 태국어, 베트남어, 인도네시아어, 몽골어)
- **학습 진도 관리** - 일일 학습/복습 목표 설정, 진행률 추적
- **단어 상세 정보** - 발음, 품사, 활용형, 예문 제공
- **테마 지원** - Light/Dark 모드 (일반/중간/고대비)

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **State**: Redux Toolkit + TanStack Query
- **Styling**: SCSS Modules + Material Web Components
- **i18n**: next-intl
- **Animation**: Motion
- **Algorithm**: ts-fsrs
- **Deploy**: Cloudflare Pages

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
├── api/          # API 호출 (카드, 덱, 학습, 인증)
├── app/          # Next.js App Router 페이지
│   └── [locale]/ # 다국어 라우팅
│       ├── [categoryType]/[category]/ # 덱 목록/단어 목록
│       ├── card/[cardId]/             # 단어 상세
│       ├── learning/[category]/       # 학습 화면
│       ├── login/                     # 로그인
│       └── settings/                  # 설정
├── components/   # UI 컴포넌트
├── services/     # HTTP 클라이언트, 인증 서비스
├── store/        # Redux 스토어 (학습 상태)
├── types/        # TypeScript 타입 정의
└── utils/        # FSRS, 포맷터 등 유틸리티
```

## 배포 계획

1. `@cloudflare/next-on-pages` 연동
2. Cloudflare Pages 배포 파이프라인 구성
3. 백엔드 API를 Cloudflare Workers 또는 외부 서비스로 대체
