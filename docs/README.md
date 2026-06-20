# nest-backend-epsas

Backend para la gestión del proceso de **etapa práctica profesional** de aprendices del SENA. Administra el ciclo completo: registro de empresas y modalidades, creación de etapas prácticas, asignación de instructores, seguimiento bimestral, bitácoras diarias, observaciones y documentación adjunta.

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Frontend)                           │
│          Cookie: token  │  Header: x-centro-id, x-cargo            │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP  /api2/*
┌──────────────────────────────────▼──────────────────────────────────┐
│                       NestJS Application                            │
│                                                                     │
│  JwtExtractorMiddleware → RequestContextService (AsyncLocalStorage) │
│  RlsGuard (global) ─── @Public() / @Roles('admin','docente',...)    │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                      Módulos de negocio                         │ │
│ │                                                                 │ │
│ │  configuracion  ─────────────────────────────────────────────┐ │ │
│ │  modalidad      ─────────────────────────────────────────┐   │ │ │
│ │  empresa        ──── ERP externo (municipios)            │   │ │ │
│ │                                                          │   │ │ │
│ │  etapa_practica ◄─── [central] ─────────────────────────►│◄──┘ │ │
│ │       │  crea en cascade al crear:                       │     │ │
│ │       ├── asignaciones ──── ERP externo (personas)       │     │ │
│ │       ├── seguimientos ──── ERP externo (matrículas)     │     │ │
│ │       │       └── bitacoras                              │     │ │
│ │       │       └── observaciones                          │     │ │
│ │       ├── formatos                                        │     │ │
│ │       └── documentos-practica                            │     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  TenantFilter (centroId)  +  RlsFilter (rol)  en cada consulta     │
│  AppCacheService ──► Redis (fallback: memoria, TTL 30 s)            │
│  RlsSubscriber  ──► set_config PostgreSQL por conexión              │
└────────────────┬──────────────────────────────────┬────────────────┘
                 │                                  │
      ┌──────────▼──────────┐           ┌───────────▼──────────┐
      │    PostgreSQL 14+   │           │   ERP Externo         │
      │  (TypeORM sync:true)│           │  /api/municipios      │
      │  RLS via set_config │           │  /api/personas        │
      └─────────────────────┘           │  /api/matriculas/..   │
                                        └──────────────────────┘
```

### Flujo de seguridad por request

```
Request entrante
  │
  ▼
JwtExtractorMiddleware
  │  Decodifica JWT en base64 (sin verificar firma)
  │  Lee headers: x-centro-id, x-cargo, x-sede-id
  │  Mapea cargo → rol:
  │    administrador → admin
  │    instructor    → docente
  │    aprendiz      → estudiante
  │  Almacena en AsyncLocalStorage (RequestContextService)
  ▼
RlsGuard (APP_GUARD global)
  │  @Public()   → pasa sin validar
  │  Sin usuario → 401 Unauthorized
  │  @Roles(...) → verifica rol → 403 Forbidden si no coincide
  ▼
RlsSubscriber (pool.on 'acquire', por cada conexión BD)
  │  SELECT set_config('app.current_user_id',   sub,      false)
  │  SELECT set_config('app.current_user_rol',  rol,      false)
  │  SELECT set_config('app.current_centro_id', centroId, false)
  ▼
Repositorio TypeORM
  │  TenantFilter → WHERE centroId = :centroId
  │  RlsFilter    → filtra por rol:
  │    admin      → sin filtro adicional
  │    docente    → INNER JOIN asignaciones WHERE instructor = :personaId
  │    estudiante → WHERE matriculaId IN (:...matriculaIds)
  ▼
AppCacheService (Redis / memoria, TTL 30 s)
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | NestJS | 11.x |
| Lenguaje | TypeScript | 5.x |
| Base de datos | PostgreSQL | 14+ |
| ORM | TypeORM (`synchronize: true`) | 0.3.x |
| Caché | Redis + `cache-manager-redis-yet` | — |
| HTTP cliente | Axios (`@nestjs/axios`) | — |
| Subida de archivos | Multer (`@nestjs/platform-express`) | — |
| Documentación API | Swagger (`@nestjs/swagger`) | — |
| Autenticación | JWT decode manual (base64, sin verificación de firma) | — |
| Validación | `class-validator` + `class-transformer` | — |
| Cookies | `cookie-parser` | — |

---

## Estructura de carpetas

```
nest-backend-epsas/
├── src/
│   ├── main.ts                               # Bootstrap: puerto, pipes, Swagger, dirs uploads
│   ├── app.module.ts                         # Módulo raíz: TypeORM, CacheModule, guards
│   ├── common/
│   │   ├── cache/app-cache.service.ts        # Caché tenant-aware (Redis / memoria)
│   │   ├── decorators/roles.decorator.ts     # @Roles(...) y @Public()
│   │   ├── filters/rls.filter.ts             # Filtros de fila por rol (4 recursos)
│   │   ├── filters/tenant.filter.ts          # Filtro por centroId
│   │   ├── guards/rls.guard.ts               # Guard global de autenticación y roles
│   │   ├── middleware/jwt-extractor.ts        # Decodifica JWT, puebla AsyncLocalStorage
│   │   └── rls/request-context.ts            # AsyncLocalStorage: getUser(), getCentroId()
│   ├── database/rls.subscriber.ts            # Hook pool → set_config PostgreSQL
│   └── modules/
│       ├── configuracion/                    # Configuración global (min_avance)
│       ├── modalidad/                        # Tipos de modalidad
│       ├── empresa/                          # Empresas de práctica
│       ├── etapa_practica/                   # ENTIDAD CENTRAL
│       ├── asignaciones/                     # Instructor → etapa
│       ├── seguimientos/                     # 3 fases bimestrales
│       ├── bitacoras/                        # Registros diarios
│       ├── observaciones/                    # Notas e imágenes del instructor
│       ├── formatos/                         # Plantillas de documentos
│       └── documentos-practica/              # Archivos adjuntos a una etapa
├── uploads/
│   ├── bitacoras/       # PDFs de bitácoras del aprendiz
│   ├── actas/           # PDFs de actas de seguimiento
│   ├── observaciones/   # Imágenes de evidencia
│   ├── formatos/        # Plantillas (PDF, Word, imágenes)
│   └── documentos/      # Documentos adjuntos a la etapa
├── docs/                # Documentación detallada por módulo (aquí estás)
├── .env                 # Variables de entorno
├── CLAUDE.md            # Guía para Claude Code
├── nest-cli.json
└── package.json
```

Cada módulo sigue la **arquitectura hexagonal** (puertos y adaptadores):

```
módulo/
├── domain/
│   ├── entities/        ← clase de dominio pura (sin decoradores ORM)
│   └── ports/           ← interfaces IXxxRepository / IXxxServicePort + tokens
├── application/
│   └── *.service.ts     ← lógica de negocio; depende solo de puertos
└── infrastructure/
    ├── entities/         ← entidad TypeORM (@Entity, @Column...)
    ├── adapters/
    │   ├── *.typeorm.repository.ts   ← implementa IXxxRepository
    │   └── *.http.adapter.ts         ← implementa IXxxServicePort (llama al ERP)
    └── http/
        ├── dto/           ← DTOs con class-validator
        └── *.controller.ts
```

---

## Requisitos previos

- Node.js 20+
- PostgreSQL 14+
- Redis (opcional — el sistema usa memoria si no está disponible)

---

## Instalación y configuración

```bash
# 1. Instalar dependencias
npm install

# 2. Editar variables de entorno
# El archivo .env ya existe con valores por defecto para desarrollo local
```

Variables disponibles en `.env`:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=backend-nest-epsas

# Caché (opcional — fallback a memoria si Redis no está disponible)
REDIS_HOST=localhost
REDIS_PORT=6379

# ERP externo (microservicio de personas, municipios y matrículas)
ERP_API_URL=http://localhost:3000/api

# Puerto del servidor
PORT=3001
```

---

## Ejecución

```bash
# Desarrollo (watch mode)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

| URL | Descripción |
|---|---|
| `http://localhost:3001/api2/*` | Endpoints de la API (prefijo global `api2`) |
| `http://localhost:3001/api/docs` | Swagger UI |
| `http://localhost:3001/uploads/*` | Archivos subidos (servidos estáticamente) |

> **Primera ejecución**: TypeORM tiene `synchronize: true`, por lo que crea y actualiza el esquema automáticamente al arrancar. Los directorios de `uploads/` también se crean si no existen.

---

## Comandos de desarrollo

```bash
npm run lint          # ESLint con auto-fix
npm run format        # Prettier sobre src/ y test/
npm test              # Jest (todos los *.spec.ts bajo src/)
npm run test:watch    # Jest en modo watch
npm run test:cov      # Reporte de cobertura
npm run test:e2e      # Tests end-to-end

# Ejecutar tests de un módulo específico
npx jest src/modules/modalidad --no-coverage
```

---

## Headers requeridos en cada request

| Header | Requerido | Descripción |
|---|---|---|
| `Authorization: Bearer <token>` | Sí* | JWT del sistema de autenticación externo |
| `x-centro-id` | Sí | UUID del centro de formación del usuario |
| `x-cargo` | No | Sobreescribe el rol del JWT (`administrador`, `instructor`, `aprendiz`) |
| `x-sede-id` | No | UUID de la sede (para filtros opcionales) |

> \* También se acepta la cookie `token`. El JWT **no se verifica** — el middleware solo decodifica el payload en base64url.

---

## Roles del sistema

| Rol interno | Cargo en JWT / header | Acceso |
|---|---|---|
| `admin` | `administrador` | CRUD completo en todos los recursos del centro |
| `docente` | `instructor` | Lectura y actualización en sus etapas asignadas |
| `estudiante` | `aprendiz` | Solo lectura de sus propios recursos (por `matriculaId`) |

---

## Flujo principal: crear una etapa práctica

```
POST /api2/etapa-practica
Headers: Authorization, x-centro-id
Body: {
  empresaId, modalidadId, matriculaId,
  fecha_inicio, fecha_fin, estado,
  avanceMatricula?,   ← se valida contra configuracion.minAvance si se envía
  asignacion?         ← crea la asignación del instructor en el mismo request
}

El servidor ejecuta en orden:
  1. Valida avanceMatricula >= configuracion.minAvance (si viene en el body)
  2. Crea la EtapaPractica
  3. Genera 3 Seguimientos automáticamente:
       Seg 1: fecha_inicio     →  fecha_inicio + 2 meses
       Seg 2: fecha_inicio + 2m  →  fecha_inicio + 4 meses
       Seg 3: fecha_inicio + 4m  →  fecha_inicio + 6 meses
  4. Genera 2 Bitácoras por seguimiento (6 en total, estado: 'pendiente')
  5. [Opcional] Crea la Asignación del instructor (valida existencia en ERP)

Retorna: la EtapaPractica creada
```

---

## Servicios externos (ERP)

| Operación | Endpoint | Módulo |
|---|---|---|
| Validar municipio al crear/editar empresa | `GET ${ERP_API_URL}/municipios/:id` | `empresa` |
| Validar instructor al crear/editar asignación | `GET http://localhost:3000/api/personas/:id` | `asignaciones` |
| Obtener matrículas de un alumno | `GET http://localhost:3000/api/matriculas/persona/:id` | `seguimientos` |

> `MunicipioHttpAdapter` usa la variable `ERP_API_URL`. `PersonaHttpAdapter` y `MatriculaHttpAdapter` tienen la URL hardcodeada — pendiente de unificar con la variable de entorno.

---

## Documentación por módulo

### Fase 1 — Base
- [Configuracion](configuracion.md) — ajustes globales del sistema (porcentaje mínimo de avance)
- [Modalidad](modalidad.md) — tipos de modalidad de práctica

### Fase 2 — Entidades principales
- [Empresa](empresa.md) — empresas donde se realiza la práctica
- [EtapaPractica](etapa_practica.md) — entidad central; crea seguimientos y bitácoras en cascade

### Fase 3 — Flujo de práctica
- [Asignaciones](asignaciones.md) — asignación de instructores a etapas
- [Seguimientos](seguimientos.md) — 3 fases bimestrales por etapa
- [Bitacoras](bitacoras.md) — registros diarios del aprendiz
- [Observaciones](observaciones.md) — notas y evidencias del instructor

### Fase 4 — Documentación
- [Formatos](formatos.md) — plantillas de documentos del proceso
- [Documentos Práctica](documentos-practica.md) — archivos adjuntos a una etapa
