# nestjs-boilerplate

NestJS 11 + Fastify 백엔드 보일러플레이트. `AGENT-STEERING-NEW.md` 표준(flat controller 구조, Prisma 싱글턴, 플러그인 패턴, `ApiResponseDto`, RS256 JWT, scanner-block, 요청 로깅)을 그대로 따릅니다.

## 스택

- 런타임/PM: **bun**
- 프레임워크: NestJS 11 + Fastify 어댑터
- DB/ORM: PostgreSQL + Prisma 7 + `@prisma/adapter-pg`
- 인증: 자체 RS256 JWT + `AuthGuard`

## 시작하기

```bash
# 1) 의존성 설치
bun install

# 2) 환경변수
cp .env.example .env   # DATABASE_URL 등 채우기

# 3) RS256 키쌍 (이미 생성되어 있으면 생략)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out src/resources/keys/private.pem
openssl rsa -in src/resources/keys/private.pem -pubout -out src/resources/keys/public.pem

# 4) DB 마이그레이션
bun run prisma:migrate

# 5) 개발 서버
bun run start:dev
```

## 디렉터리 구조

```
src/
  @types/fastify.d.ts        # FastifyRequest.user 타입 확장
  controllers/               # auth.controller.ts, health.controller.ts
  modules/app.module.ts      # 단일 루트 모듈 (모든 컨트롤러 등록)
  resources/
    constants/               # http-method.enum.ts
    database/main.ts         # prisma 싱글턴(Proxy) + initDatabase()
    dto/                     # response.dto.ts (ApiResponseDto), auth.dto.ts
    guards/                  # auth.guard.ts, s-admin.guard.ts
    keys/                    # RS256 키쌍 (gitignore)
    middleware/              # exception.middleware.ts (전역 에러 필터)
    plugins/                 # jwt / token-issuer / client-ip / scanner-block / request-logging / utility / location
    stores/                  # auth-codes.ts (인메모리 스토어 예시)
  main.ts                    # 부트스트랩
```

## API

| Method | Path                     | 설명                         |
|--------|--------------------------|------------------------------|
| POST   | `/auth/register`         | 회원가입                     |
| POST   | `/auth/login`            | 로그인 (access/refresh 발급) |
| POST   | `/auth/refresh`          | 토큰 재발급 (rotation)       |
| GET    | `/auth/@me`              | 내 정보 (AuthGuard)          |
| POST   | `/auth/logout`           | 로그아웃 (AuthGuard)         |
| GET    | `/health`                | 헬스체크                     |
| GET    | `/.well-known/jwks.json` | 공개키 JWKS                  |

모든 응답은 `{ success, data, error, requested_at }` 형태(`ApiResponseDto`)입니다.

## 새 컨트롤러 추가

1. `src/controllers/xxx.controller.ts` 작성 (핸들러는 `@Res() _response`로 `ApiResponseDto.success(...)` 전송)
2. `src/modules/app.module.ts`의 `controllers` 배열에 등록
