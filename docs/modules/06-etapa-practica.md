# Módulo: `etapa_practica`

## Descripción general

Gestiona las etapas de práctica de los aprendices. Es el módulo central del sistema: agrupa asignaciones, seguimientos, bitácoras, observaciones, formatos y documentos de práctica. Permite registrar el avance, el estado y las observaciones de cada etapa. Admite la creación simultánea de una asignación al crear la etapa.

---

## Arquitectura hexagonal

```
etapa_practica/
├── domain/
│   ├── entities/
│   │   └── etapa_practica.entity.ts                ← Entidad de dominio pura
│   └── ports/
│       └── etapa_practica.repository.port.ts       ← Contrato IEtapaPracticaRepository
├── application/
│   ├── etapa_practica.service.ts                   ← Lógica de negocio
│   └── dto/
│       ├── create-etapa_practica.command.ts        ← Comando de creación (con nested CreateAsignacionEnEtapaCommand)
│       └── update-etapa_practica.command.ts        ← Partial del comando de creación
└── infrastructure/
    ├── entities/
    │   └── etapa_practica.orm-entity.ts            ← Entidad TypeORM
    ├── adapters/
    │   └── etapa_practica.typeorm.repository.ts    ← Implementación del repositorio
    └── http/
        ├── etapa_practica.controller.ts            ← Controlador REST
        └── dto/
            ├── create-etapa_practica.dto.ts        ← DTO de entrada con validación
            └── update-etapa_practica.dto.ts        ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `EtapaPractica`

```ts
export class EtapaPractica {
  id: string;
  matriculaId: string;
  avance: number;
  estado: string;
  observacion?: string;
  empresa?: { id: string };
  asignacion?: { id: string };
}
```

### Puerto `IEtapaPracticaRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data: CreateEtapaPracticaData) → Promise<EtapaPractica>` | Inserta etapa (y asignación anidada si se provee) |
| `findAll` | `() → Promise<EtapaPractica[]>` | Lista con tenant filter |
| `findById` | `(id: string) → Promise<EtapaPractica \| null>` | Busca con tenant filter |
| `findByMatriculaId` | `(matriculaId: string) → Promise<EtapaPractica[]>` | Lista etapas de una matrícula |
| `save` | `(e: EtapaPractica) → Promise<EtapaPractica>` | Actualiza con tenant filter |
| `deleteById` | `(id: string) → Promise<number>` | Elimina con `{ id, centroId }` |
| `updateObservacion` | `(id, obs) → Promise<void>` | Actualiza solo la observación con tenant filter |
| `updateAvance` | `(id, avance) → Promise<void>` | Actualiza solo el avance con tenant filter |
| `updateEstado` | `(id, estado) → Promise<void>` | Actualiza solo el estado con tenant filter |

`CreateEtapaPracticaData` incluye el tipo anidado `CreateAsignacionEnEtapaData` para la asignación opcional que se crea junto con la etapa.

---

## Capa de aplicación

### Commands

**`create-etapa_practica.command.ts`**
```ts
export interface CreateAsignacionEnEtapaCommand {
  instructor: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  horas: number;
}

export interface CreateEtapaPracticaCommand {
  matriculaId: string;
  avance: number;
  estado: string;
  observacion?: string;
  empresaId?: string;
  asignacion?: CreateAsignacionEnEtapaCommand;
}
```

**`update-etapa_practica.command.ts`**
```ts
export type UpdateEtapaPracticaCommand = Partial<CreateEtapaPracticaCommand>;
```

### Servicio `EtapaPracticaService`

| Método | Descripción |
|---|---|
| `create(dto)` | Valida `avance` (0-100) **fuera** del try-catch para que el 400 no sea capturado por `handleDBExceptions` |
| `findAll()` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `update(id, dto)` | Verifica existencia y delega al repositorio |
| `remove(id)` | Verifica existencia; lanza `NotFoundException` si `affected === 0` |
| `updateObservacion(id, obs)` | Verifica existencia, luego delega a la operación específica del repositorio |
| `updateAvance(id, avance)` | Valida rango (0-100) **fuera** del try-catch, luego delega |
| `updateEstado(id, estado)` | Verifica existencia, luego delega |

`handleDBExceptions` incluye el guard `if (error instanceof HttpException) throw error` para evitar que excepciones HTTP lanzadas dentro del try-catch sean convertidas en 500.

---

## Capa de infraestructura

### Repositorio TypeORM

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`; crea la asignación anidada si se provee
- `findAll()` / `findById()`: QueryBuilder + `TenantFilter.apply(qb, 'e')`
- `deleteById()`: `this.orm.delete({ id, centroId })`
- `updateObservacion()`, `updateAvance()`, `updateEstado()`: `.andWhere('centroId = :centroId', { centroId })`

### ORM Entity `EtapaPracticaOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `matriculaId` | `uuid` | ID de matrícula del aprendiz |
| `avance` | `numeric` | Porcentaje 0-100 |
| `estado` | `text` | |
| `observacion` | `text nullable` | |
| `empresa` | `ManyToOne` | → `EmpresaOrmEntity` |
| `asignacion` | `OneToOne` | → `AsignacionOrmEntity` |

---

## API REST

### Controller `EtapaPracticaController`

**Base path:** `/api2/etapa-practica`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crea una nueva etapa de práctica |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todas las etapas del tenant |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene una etapa por UUID |
| `PATCH` | `/:id` | `admin`, `docente` | Actualiza una etapa |
| `DELETE` | `/:id` | `admin` | Elimina una etapa |
| `PATCH` | `/observacion/:id` | `admin`, `docente` | Actualiza solo la observación |
| `PATCH` | `/avance/:id` | `admin`, `docente` | Actualiza solo el avance (valida 0-100) |
| `GET` | `/matricula/:matriculaId` | `admin`, `docente`, `estudiante` | Lista etapas de una matrícula |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### DTO de entrada `CreateEtapaPracticaDto`

| Campo | Tipo | Validación |
|---|---|---|
| `matriculaId` | `string` | `@IsUUID` `@IsNotEmpty` |
| `avance` | `number` | `@IsNumber` `@Min(0)` `@Max(100)` |
| `estado` | `string` | `@IsString` `@IsNotEmpty` |
| `observacion` | `string` | `@IsString` `@IsOptional` |
| `empresaId` | `string` | `@IsUUID` `@IsOptional` |
| `asignacion` | `CreateAsignacionEnEtapaDto` | `@ValidateNested` `@Type(() => CreateAsignacionEnEtapaDto)` `@IsOptional` |

`CreateAsignacionEnEtapaDto` incluye `fecha_inicio` y `fecha_fin` con `@Type(() => Date)` + `@IsDate()`.

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | Creación y eliminación solo `admin`; actualizaciones para `admin` y `docente` |
| Multi-tenant | Tenant filter en todas las operaciones de repositorio |
| Validación de avance | Verificada **fuera** del try-catch para garantizar respuesta 400 correcta |
| `HttpException` guard | `handleDBExceptions` relanza `HttpException` sin transformarla en 500 |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba DTOs de `infrastructure` | Creados `CreateEtapaPracticaCommand` / `UpdateEtapaPracticaCommand` con `CreateAsignacionEnEtapaCommand` anidado |
| 2 | Validación de avance dentro del try-catch → `BadRequestException` convertida en 500 por `handleDBExceptions` | Validación movida fuera del try-catch |
| 3 | `handleDBExceptions` sin guard de `HttpException` | Añadido `if (error instanceof HttpException) throw error` |
| 4 | `deleteById`, `updateObservacion`, `updateAvance`, `updateEstado` sin filtro de tenant | Añadido `centroId` en todos los WHERE de mutaciones |
| 5 | `@IsDateString()` sin `@Type(() => Date)` en `CreateAsignacionEnEtapaDto` | Reemplazado por `@Type(() => Date)` + `@IsDate()` |
| 6 | `ParseUUIDPipe` faltante en `/observacion/:id`, `/avance/:id`, `/matricula/:matriculaId` | Añadido en todos los parámetros de ruta |
| 7 | Código de debug `console.log('[EP-DEBUG]...')` y consulta ORM extra en el repositorio | Eliminados |
