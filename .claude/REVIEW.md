# Code Review 지침

## 중점 검토 항목
- TypeScript strict mode 위반
- React hooks 규칙 위반 (조건부 호출, 의존성 배열 누락)
- async/await 에러 핸들링 누락
- XSS, CSRF, SQL injection 등 보안 취약점
- N+1 쿼리, 불필요한 리렌더링 등 성능 이슈

## 무시할 항목
- 테스트 파일의 any 타입 사용
- console.log (개발 환경)
- 주석 스타일 차이
- import 순서 (린터가 처리)

## 심각도 기준
- Critical: 프로덕션 장애 유발 버그, 데이터 손실
- High: 보안 취약점, 인증/인가 결함
- Medium: 성능 저하, 유지보수 어려움, 미흡한 에러 핸들링
- Low: 코드 스타일, 네이밍, 문서화 개선
