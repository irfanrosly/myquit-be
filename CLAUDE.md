# my-quit-be

NestJS 11 REST API for MYQuitMate — smoking cessation app.

## Stack

- **Framework**: NestJS 11
- **ORM**: Prisma 7 with `@prisma/adapter-pg` (pg driver adapter)
- **DB**: PostgreSQL
- **Auth**: JWT (access + refresh tokens) via cookies, passport-jwt
- **Validation**: class-validator + class-transformer, global ValidationPipe
- **Port**: 3001

## Critical: Prisma 7

Prisma 7 requires `@prisma/adapter-pg`. Schema has **no `url` in datasource** — URL is passed at runtime via adapter. Config lives in `prisma.config.ts` (reads `DATABASE_URL` env). Do not add `url = env("DATABASE_URL")` to schema.prisma.

## Project Structure

```
src/
  main.ts                    # Bootstrap: CORS, cookies, pipes, filters, interceptors
  app.module.ts
  common/
    decorators/              # Custom param decorators (e.g. @CurrentUser)
    filters/                 # HttpExceptionFilter (global)
    guards/                  # JWT auth guard
    interceptors/            # TransformInterceptor (global response wrapper)
  modules/
    auth/                    # Login, register, refresh, logout + JWT strategies
    users/                   # User profile CRUD
    onboarding/              # QuitPlan creation/update
    progress/                # Smoke-free stats, money saved
    craving-toolkit/         # Breathing + distraction activity logging
    gamification/            # Points, badges, UserStats
  prisma/                    # PrismaService (injected as module)
prisma/
  schema.prisma
  migrations/
prisma.config.ts             # Prisma 7 config with adapter-pg
```

## Key Models

`User` → `QuitPlan` (1:1), `MoodLog` (1:many), `ActivityLog` (1:many), `Badge` (1:many), `UserStats` (1:1), `RefreshToken` (1:many)

## Dev Commands

```bash
npm run start:dev     # Watch mode on :3001
npm run build         # Compile to dist/
npm run test          # Jest unit tests
npm run test:e2e      # E2E tests
npx prisma migrate dev   # Run migrations
npx prisma studio        # DB GUI
```

## Environment Variables

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGIN=http://localhost:3002
PORT=3001
```

## Patterns

- All responses wrapped by `TransformInterceptor` → `{ data, statusCode, timestamp }`
- HTTP errors use `HttpExceptionFilter`
- Auth routes: cookies for refresh token, Bearer header for access token
- Module pattern: `*.module.ts` imports PrismaModule, registers controller + service
- DTOs in `dto/` subfolder per module, validated with class-validator decorators
