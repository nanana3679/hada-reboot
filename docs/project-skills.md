# HADA Reboot 프로젝트 역량 맵

> 문제 → 의사결정 → 해결 과정을 통해 획득한/획득 예정인 역량을 정리한다.

---

## 1. 서버리스 아키텍처 설계 및 마이그레이션

### 문제
Spring Boot + Next.js 이중 서버 구조의 운영 비용과 복잡성. 서버 유지비 발생, 두 시스템 간 네트워크 지연, 배포·모니터링 이중 관리.

### 의사결정 과정
- Spring Boot 유지 vs Cloudflare Workers 올인 vs 외부 DB(Supabase) 비교 (RFC-0001, RFC-0004)
- 1인 프로젝트의 운영 부담을 최소화하면서 글로벌 저지연 응답을 달성해야 하는 트레이드오프 평가
- RFC-0001(JWT 직접 구현)을 작성 후 RFC-0004로 supersede — **설계를 반복하며 개선하는 경험**

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| Edge Runtime 이해 | V8 isolate 환경의 제약(Node.js API 미지원, 번들 크기 제한 10MB, crypto API 차이) |
| 서버리스 DB 설계 | D1(SQLite 기반)의 특성 — 바인딩 접근, 무료 티어 한계, JSON 컬럼 활용 vs 정규화 트레이드오프 |
| 비용 최적화 사고 | Cloudflare 무료 티어(D1 5GB, KV, Workers)로 인프라 비용 0 달성 전략 |
| 아키텍처 의사결정 문서화 | RFC(Request for Comments) 작성 — 맥락, 결정, 대안, 결과를 구조적으로 기록 |

---

## 2. ORM 선택과 스키마 설계

### 문제
58,102건의 한국어 단어 데이터를 Edge Runtime에서 효율적으로 조회해야 한다. 11개 언어 번역, 30개 주제 분류, FSRS 학습 상태를 관리해야 한다.

### 의사결정 과정
- Prisma(~400KB 번들) vs Drizzle(~50KB 번들) — Workers 번들 크기 제한과 콜드 스타트 고려
- topics를 정규화 테이블 vs JSON 배열 — 30개 고정값에 대해 JOIN 비용 vs 인덱스 불가 트레이드오프
- level을 별도 컬럼 vs topics에 통합 — API 분기 로직 단순화 vs 직관성 트레이드오프

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| 타입 안전 ORM | Drizzle ORM의 SQL에 가까운 쿼리 빌더, `z.infer`와 유사한 스키마→타입 추론 |
| 비정규화 설계 판단 | JSON 컬럼의 적절한 사용 시점 — "고정된 소수의 값"이면 JSON, "자주 검색하는 값"이면 정규화 |
| 스키마 진화 설계 | `external_id` 패턴으로 인증 제공자 변경에 대비하는 간접 참조 설계 |
| SQLite 특화 지식 | `json_each()` 함수, D1의 트랜잭션 제약, SQLite의 window function 제한 |

---

## 3. 인증 시스템 구현

### 문제
Edge Runtime에서 동작하는 인증 시스템이 필요하다. 기존 서버 사이드 쿠키 + Axios 인터셉터 방식은 Cloudflare Workers와 호환되지 않는다.

### 의사결정 과정
- JWT 직접 구현(RFC-0001) → Auth.js v5 + D1 Adapter(RFC-0005)로 전환
- 직접 구현 vs Auth.js vs Lucia(maintenance mode) vs Clerk/Auth0(외부 서비스) 비교
- `jose` v5의 Workers crypto 비호환 문제 발견 → pnpm overrides로 v6 강제

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| OAuth 2.0 플로우 | Google OAuth의 Authorization Code Flow 이해 |
| 세션 관리 전략 | JWT(stateless) vs DB 세션(stateful)의 트레이드오프, Auth.js의 database 전략 |
| 의존성 호환성 해결 | pnpm overrides로 transitive dependency 버전 강제 — `jose` v5→v6 |
| 보안 설계 사고 | localStorage JWT의 XSS 취약점 인식 → HttpOnly 쿠키 기반 세션으로 전환 판단 |
| Pre-release 라이브러리 운용 | Auth.js 5.0.0-beta, @opennextjs/cloudflare pre-1.0 환경에서의 edge case 대응 |

---

## 4. 배포 파이프라인과 트러블슈팅

### 문제
첫 Cloudflare Workers 배포에서 5개의 연쇄 이슈 발생 (pnpm 버전, import 경로, TypeScript 에러, Next.js 호환 버그, SSR 에러).

### 의사결정 과정
- 각 이슈를 순차적으로 진단하고 해결 — 에러 메시지 → 원인 분석 → 최소 변경 원칙 적용
- Next.js 16.2.0의 `prefetch-hints.json` 매니페스트 미지원 → 다운그레이드 판단 (업스트림 이슈 확인)
- 모든 과정을 `docs/deploy-log/`에 기록

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| CI/CD 파이프라인 구축 | GitHub Actions + pnpm + Cloudflare Workers 배포 자동화, 실패 시 자동 이슈 생성 |
| 체계적 디버깅 | Edge Runtime 에러(Error 1101)의 원인 추적 — 매니페스트 로딩 실패 → 업스트림 이슈 확인 |
| SSR/CSR 경계 이해 | `createPortal`의 SSR 비호환, `typeof document !== 'undefined'` 가드 패턴 |
| 버전 호환성 관리 | Next.js + @opennextjs/cloudflare 간 버전 매트릭스 파악, 안전한 다운그레이드 판단 |
| 배포 로그 문화 | 문제-원인-해결을 구조화하여 기록하는 습관 — 동일 이슈 재발 시 즉시 참조 가능 |

---

## 5. 국제화(i18n) 및 다국어 지원

### 문제
11개 언어(아랍어, 영어, 스페인어, 프랑스어, 인도네시아어, 일본어, 몽골어, 러시아어, 태국어, 베트남어, 중국어)를 지원하는 UI와 콘텐츠 구조가 필요하다.

### 의사결정 과정
- next-intl 도입으로 App Router 기반 `[locale]` 라우팅 구현
- 번역 데이터를 words 테이블에 22개 컬럼(11언어 × 2)으로 넣을지 vs translations 테이블 분리 → 분리 선택

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| i18n 아키텍처 | next-intl의 미들웨어 기반 로케일 라우팅, 메시지 파일 관리(11개 JSON) |
| 다국어 DB 설계 | `translations(word_id, lang_code)` 패턴 — 새 언어 추가가 INSERT만으로 가능한 확장성 |
| RTL/다양한 문자 체계 | 아랍어(RTL), 태국어·몽골어 등 다양한 문자 체계를 고려한 UI 설계 경험 |

---

## 6. 학습 알고리즘 (FSRS) 통합

### 문제
간격 반복 학습(Spaced Repetition)을 구현해야 한다. 단순 Leitner 시스템보다 정교한 스케줄링이 필요하다.

### 의사결정 과정
- ts-fsrs 라이브러리 채택 — Anki의 FSRS 알고리즘을 TypeScript로 구현한 라이브러리
- FSRS의 state machine(New → Learning → Review → Relearning) 이해 후 DB 스키마에 반영
- 난이도 자동 조정 가설 수립 (RFC-0002) — 데이터 기반 검증 계획 설계

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| 간격 반복 알고리즘 | FSRS의 stability, difficulty, scheduled_days 등 파라미터의 의미와 상호작용 |
| 가설 기반 개발 | RFC-0002의 3단계 검증 계획 — Phase 1(수집) → Phase 2(EDA + 검증) → Phase 3(자동화) |
| 통계적 사고 | 이중 평균(사용자별 → 카드별)으로 편향 통제, 히스테리시스로 진동 방지, 분위 기반 분류 |
| 결정적 셔플 | 같은 시드(userId + date)로 일관된 카드 순서 보장하는 알고리즘 |

---

## 7. 프론트엔드 아키텍처

### 문제
Material 3 디자인 시스템을 React에서 사용해야 하고, 상태 관리가 서버 상태(API)와 클라이언트 상태(학습 진행)로 이원화되어 있다.

### 의사결정 과정
- Material Web Components + @lit/react로 Web Components를 React에서 사용
- Redux Toolkit(클라이언트 상태) + React Query(서버 상태) 이원 상태 관리 채택
- SCSS Modules + PostCSS(pxtorem)로 반응형 스타일링

### 획득 역량
| 역량 | 구체적 내용 |
|------|-----------|
| Web Components + React 통합 | @lit/react를 통한 Material Web Components 사용, 이벤트 바인딩 차이 이해 |
| 이원 상태 관리 패턴 | Redux(동기적·예측 가능한 학습 상태) + React Query(비동기·캐싱이 필요한 API 상태) 분리 |
| Next.js App Router | 서버/클라이언트 컴포넌트 경계, 레이아웃 중첩, 동적 라우팅(`[locale]`, `[categoryType]`) |
| 반응형 설계 | postcss-pxtorem 기반 rem 변환, useWindowSize 기반 적응형 네비게이션 |

---

## 8. 캐싱 전략 설계 (예정)

### 문제
58,000건 단어의 카테고리별 집계 쿼리를 매 요청마다 실행하면 D1 무료 티어의 읽기 한도(5M rows/day)를 빠르게 소진한다.

### 의사결정 과정
- Cloudflare KV를 캐싱 레이어로 사용
- 글로벌 캐시(단어 수 — 변하지 않음) vs 유저별 캐시(학습 상태 카운트 — 학습 시 무효화) 분리

### 획득 예정 역량
| 역량 | 구체적 내용 |
|------|-----------|
| 캐시 무효화 전략 | 쓰기 시 캐시 무효화(write-through), TTL 기반 만료, 키 네이밍 설계 |
| KV Store 운용 | Cloudflare KV의 eventual consistency 특성 이해, 글로벌 vs 유저별 키 분리 |

---

## 9. 입력 검증 체계화 (예정)

### 문제
API 엔드포인트마다 수동 조건문으로 검증하여 누락 위험이 있고, TypeScript 타입과 런타임 검증이 이중 관리된다.

### 의사결정 과정
- Zod vs Valibot 비교 (RFC-0003) — 번들 크기(14KB vs 5KB) vs 생태계 성숙도
- GET 파라미터는 수동, POST/PATCH body만 Zod 적용 — 과도한 적용 방지

### 획득 예정 역량
| 역량 | 구체적 내용 |
|------|-----------|
| 런타임 검증 + 타입 통합 | Zod 스키마에서 `z.infer`로 타입 자동 추론, 단일 소스 원칙(Single Source of Truth) |
| API 에러 응답 표준화 | 구조화된 에러 형식 `{ error, details }` 통일 |

---

## 10. 데이터 파이프라인 (예정)

### 문제
58,102건의 CSV 원시 데이터를 D1에 시딩해야 한다. 어휘 등급(초급/중급/고급) → 영문 enum 변환, 주제명 매핑 등 변환 로직이 필요하다.

### 획득 예정 역량
| 역량 | 구체적 내용 |
|------|-----------|
| ETL 스크립트 설계 | CSV 파싱 → 변환(level→topics 통합, 주제 매핑) → D1 벌크 INSERT |
| 데이터 무결성 관리 | 동형어(homograph) 처리, FK 참조 순서, 재시딩 전략 |

---

## 역량 분류 요약

### 백엔드/인프라
- Cloudflare Workers (Edge Runtime, D1, KV, Wrangler)
- 서버리스 아키텍처 설계 및 비용 최적화
- Drizzle ORM + SQLite 스키마 설계
- Auth.js v5 + OAuth 2.0 인증
- CI/CD (GitHub Actions)

### 프론트엔드
- Next.js 16 App Router (서버/클라이언트 컴포넌트)
- Material Web Components + React 통합
- Redux Toolkit + React Query 이원 상태 관리
- next-intl 기반 11개 언어 국제화
- 반응형 디자인 (postcss-pxtorem, 적응형 레이아웃)

### 설계/사고방식
- RFC 기반 아키텍처 의사결정 프로세스
- 트레이드오프 분석 (비정규화 vs 정규화, 번들 크기 vs 기능성)
- 가설 기반 개발 (데이터 수집 → EDA → 검증 → 자동화)
- 통계적 사고 (편향 통제, 분위 기반 분류, 히스테리시스)
- 배포 트러블슈팅 및 로그 문화

### 도메인 지식
- 간격 반복 학습(Spaced Repetition) — FSRS 알고리즘
- 다국어 학습 앱 UX (11개 언어, 다양한 문자 체계)
- 교육 데이터 분석 (학습 난이도 자동 조정)
