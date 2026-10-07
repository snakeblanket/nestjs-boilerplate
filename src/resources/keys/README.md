# RS256 Key Pair

이 디렉터리에는 JWT 서명/검증용 RS256 키쌍이 들어갑니다.

- `private.pem` — 토큰 서명 (절대 커밋 금지, `.gitignore`에 등록됨)
- `public.pem` — 토큰 검증 / JWKS 노출

로컬 생성:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -in private.pem -pubout -out public.pem
```

배포 시에는 시크릿 매니저/환경 주입으로 키를 공급하세요.
