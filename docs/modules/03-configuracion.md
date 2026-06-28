# Módulo: `configuracion`

## Descripción general

Gestiona la configuración global del centro educativo. Actualmente expone un único parámetro: `minAvance`, que define el porcentaje mínimo de avance requerido en las etapas de práctica. El módulo usa una arquitectura plana (sin capas hexagonales) por decisión de diseño, dado que no tiene lógica de dominio compleja ni adaptadores externos.

---

## Arquitectura

```
configuracion/
├── configuracion.module.ts
├── configuracion.controller.ts   ← Controlador REST
├── configuracion.service.ts      ← Lógica de negocio + acceso a BD
├── dto/
│   └── update-configuracion.dto.ts ← DTO de entrada con validación
└── entities/
    └── configuracion.orm-entity.ts ← Entidad TypeORM
```

> Este módulo es intencionalmente plano. No implementa la estructura hexagonal (domain/ports/application/infrastructure) porque su responsabilidad es mínima: leer y escribir un único registro de configuración por centro.

---

## Entidad TypeORM `ConfiguracionOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Identificador único por centro — actúa como clave de negocio |
| `minAvance` | `numeric` | Porcentaje mínimo de avance (0–100) |

---

## Servicio `ConfiguracionService`

### Métodos

| Método | Descripción |
|---|---|
| `getConfig()` | Busca la configuración del centro actual. Si no existe, la crea con `minAvance = 0` de forma atómica usando `INSERT ... ON CONFLICT DO NOTHING` |
| `updateConfig(dto)` | Actualiza el registro usando `upsert` — crea si no existe, actualiza si ya existe |

### Comportamiento atómico en `getConfig()`

```ts
// INSERT ... orIgnore() garantiza que no hay race condition
// si dos requests llegan simultáneamente antes de que exista el registro
await repo.createQueryBuilder()
  .insert()
  .orIgnore()
  .values({ centroId, minAvance: 0 })
  .execute();
```

---

## API REST

### Controller `ConfiguracionController`

**Base path:** `/api2/configuracion`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/` | `admin`, `docente`, `estudiante` | Obtiene la configuración del centro actual |
| `PATCH` | `/` | `admin` | Actualiza la configuración del centro actual |

### DTO `UpdateConfiguracionDto`

| Campo | Tipo | Validación |
|---|---|---|
| `minAvance` | `number` | `@IsNumber` `@Min(0)` `@Max(100)` |

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | `GET` accesible para todos los roles; `PATCH` solo `admin` |
| Multi-tenant | `centroId` obtenido de `TenantFilter.getCurrentCentroId()` — cada centro tiene su propio registro |
| Aislamiento | La consulta filtra por `centroId` — un centro no puede leer ni modificar la configuración de otro |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | El controller no tenía ningún decorador `@Roles()` — todos los endpoints eran accesibles sin restricción de rol | `GET` → `@Roles('admin','docente','estudiante')`; `PATCH` → `@Roles('admin')` |
| 2 | No existía `UpdateConfiguracionDto` — el controlador recibía el body sin validación | Creado `UpdateConfiguracionDto` con `@IsNumber` `@Min(0)` `@Max(100)` en `minAvance` |
| 3 | `getConfig()` no era atómica — podía haber inserción duplicada bajo carga concurrente | Cambiado a `INSERT ... ON CONFLICT DO NOTHING` via `orIgnore()` |
| 4 | `updateConfig()` no creaba el registro si no existía | Cambiado a `upsert` |
