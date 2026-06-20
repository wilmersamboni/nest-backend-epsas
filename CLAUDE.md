# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev       # watch mode (port 3001)
npm run start:prod      # run compiled output

# Build & lint
npm run build           # nest build → dist/
npm run lint            # eslint --fix
npm run format          # prettier --write

# Tests
npm test                # jest (all *.spec.ts under src/)
npm run test:watch      # jest --watch
npm run test:cov        # with coverage
npm run test:e2e        # test/jest-e2e.json config
```

## Environment

Copy `.env` and adjust as needed:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=backend-nest-epsas

REDIS_HOST=localhost    # optional; falls back to in-memory cache if unavailable
REDIS_PORT=6379

ERP_API_URL=http://localhost:3000/api   # base URL for the external ERP microservice
PORT=3001
```

The app auto-creates `uploads/{bitacoras,actas,observaciones,documentos}` on startup. Uploaded files are served statically at `/uploads/*`.

Swagger UI is available at `http://localhost:3001/api/docs`. All routes are prefixed with `api2`.

TypeORM runs with `synchronize: true` — schema is auto-migrated on every boot.

## Architecture

The project uses **hexagonal architecture** (ports and adapters). Each module under `src/modules/<module>/` follows this layout:

```
domain/
  entities/        ← pure TypeScript domain entities (no ORM decorators)
  ports/           ← interfaces: IXxxRepository, IXxxServicePort + injection tokens
application/
  xxx.service.ts   ← business logic; depends only on port interfaces
infrastructure/
  entities/        ← TypeORM ORM entities (with @Entity, @Column, etc.)
  adapters/
    xxx.typeorm.repository.ts   ← implements IXxxRepository via TypeORM
    xxx.http.adapter.ts         ← implements IXxxServicePort via HTTP (external APIs)
  http/
    dto/           ← create/update DTOs with class-validator decorators
    xxx.controller.ts
module.ts          ← wires tokens: provide IXxxRepository → TypeORM adapter
```

Modules that don't have external service dependencies (e.g. `configuracion`, `modalidad`) skip the `empresa2` mapper approach and use direct TypeORM repositories.

## Security & Request Context

**Every request** goes through this chain:

1. `JwtExtractorMiddleware` (`src/common/middleware/jwt-extractor.middleware.ts`) — decodes the JWT **without verifying the signature** (base64url decode only). Reads token from cookie `token` or `Authorization: Bearer <token>` header. Also reads `x-centro-id`, `x-sede-id`, and `x-cargo` headers. Maps cargo values: `administrador→admin`, `instructor→docente`, `aprendiz→estudiante`. Stores result in `AsyncLocalStorage` via `RequestContextService`.

2. `RlsGuard` (global `APP_GUARD`) — rejects requests with no user unless the handler is decorated with `@Public()`. Enforces role checks when `@Roles(...)` is present. Roles: `admin`, `docente`, `estudiante`.

3. `RlsSubscriber` hooks the pg connection pool's `acquire` event to run:
   ```sql
   SELECT set_config('app.current_user_id', $1, false),
          set_config('app.current_user_rol', $2, false),
          set_config('app.current_centro_id', $3, false)
   ```
   This enables PostgreSQL RLS policies to filter rows automatically.

To mark an endpoint public: `@Public()`. To restrict by role: `@Roles('admin', 'docente')`.

## Caching

`AppCacheService` (`src/common/cache/app-cache.service.ts`) wraps `@nestjs/cache-manager` with tenant-aware keys:
- Admin: `{resource}:{centroId}:{rol}` (shared across all admins in a centro)
- Docente / Estudiante: `{resource}:{centroId}:{sub}` (per-user, isolated by RLS)

Default TTL is 30 s. Redis is used when available; the app falls back to in-memory cache silently. Call `appCacheService.invalidate(resource)` after mutations to clear all keys for that resource + centro.

## External Service Integration

HTTP adapters call the external ERP microservice (base URL from `ERP_API_URL`). They retrieve the raw JWT from `RequestContextService.getRawToken()` and forward it as `Authorization: Bearer`. Adapters are bound to their port interfaces in the module's `providers` array using the injection token constant (e.g. `PERSONA_SERVICE_PORT`).

## File Uploads

Modules that handle files (bitácoras, seguimientos/actas, observaciones, formatos, documentos-practica) use Multer. Physical files go to `uploads/<type>/`. When deleting a record, the service also deletes the physical file with `unlinkSync`. File paths stored in the DB are relative (e.g. `uploads/documentos/filename.pdf`).
