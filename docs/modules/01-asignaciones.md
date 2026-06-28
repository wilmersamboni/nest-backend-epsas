# Módulo: `asignaciones`

## Descripción general

Gestiona las asignaciones de instructores a etapas de práctica. Registra el instructor responsable, las fechas de inicio y fin, el estado y las horas comprometidas para cada etapa.

---

## Arquitectura hexagonal

```
asignaciones/
├── domain/
│   ├── entities/
│   │   └── asignacion.entity.ts          ← Entidad de dominio pura (sin ORM)
│   └── ports/
│       └── asignacion.repository.port.ts ← Contrato IAsignacionRepository
├── application/
│   ├── asignaciones.service.ts           ← Lógica de negocio
│   └── dto/
│       ├── create-asignacion.command.ts  ← Comando de creación (interfaz)
│       └── update-asignacion.command.ts  ← Comando de actualización (Partial)
└── infrastructure/
    ├── entities/
    │   └── asignacion.orm-entity.ts      ← Entidad TypeORM
    ├── adapters/
    │   └── asignacion.typeorm.repository.ts ← Implementación del repositorio
    └── http/
        ├── asignacione.controller.ts     ← Controlador REST
        └── dto/
            ├── create-asignacione.dto.ts ← DTO de entrada con validación
            └── update-asignacione.dto.ts ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `Asignacion`

```ts
export class Asignacion {
  id: string;
  instructor: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  horas: number;
  etapa?: { id: string };
}
```

### Puerto `IAsignacionRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data: CreateAsignacionCommand) → Promise<Asignacion>` | Inserta una nueva asignación con `centroId` del tenant |
| `findAll` | `() → Promise<Asignacion[]>` | Lista todas las asignaciones del tenant (con caché) |
| `findById` | `(id: string) → Promise<Asignacion \| null>` | Busca por id aplicando tenant filter |
| `findByEtapaId` | `(etapaId: string) → Promise<Asignacion[]>` | Lista asignaciones de una etapa |
| `save` | `(a: Asignacion) → Promise<Asignacion>` | Actualiza campos permitidos |
| `deleteById` | `(id: string) → Promise<number>` | Elimina con filtro de `centroId` |

---

## Capa de aplicación

### Commands

**`create-asignacion.command.ts`**
```ts
export interface CreateAsignacionCommand {
  instructor: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  horas: number;
  etapaId: string;
}
```

**`update-asignacion.command.ts`**
```ts
export type UpdateAsignacionCommand = Partial<CreateAsignacionCommand>;
```

### Servicio `AsignacionesService`

| Método | Descripción |
|---|---|
| `create(dto)` | Separa `etapaId`, construye el objeto de dominio y delega al repositorio |
| `findAll()` | Delega directo al repositorio (caché gestionada en el adaptador) |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `update(id, dto)` | Verifica existencia y delega al repositorio |
| `remove(id)` | Lanza `NotFoundException` si `affected === 0` |

---

## Capa de infraestructura

### Repositorio TypeORM `AsignacionTypeOrmRepository`

- Obtiene el datasource via `RequestContextService.getDataSource()` (no `@InjectRepository`)
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()` en la inserción
- `findAll()`: QueryBuilder + `TenantFilter.apply(qb, 'a')` + caché de entidades de dominio (no ORM)
- `findById()`: QueryBuilder + `TenantFilter`
- `deleteById()`: `this.orm.delete({ id, centroId })` con tenant filter

### ORM Entity `AsignacionOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `instructor` | `text` | |
| `fecha_inicio` | `date` | |
| `fecha_fin` | `date` | |
| `estado` | `text` | |
| `horas` | `int` | |
| `etapa` | `ManyToOne` | → `EtapaPracticaOrmEntity` |

---

## API REST

### Controller `AsignacionesController`

**Base path:** `/api2/asignaciones`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crea una nueva asignación |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todas las asignaciones del tenant |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene una asignación por UUID |
| `PATCH` | `/:id` | `admin`, `docente` | Actualiza una asignación |
| `DELETE` | `/:id` | `admin` | Elimina una asignación |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### DTO de entrada `CreateAsignacioneDto`

| Campo | Tipo | Validación |
|---|---|---|
| `instructor` | `string` | `@IsString` `@IsNotEmpty` |
| `fecha_inicio` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |
| `fecha_fin` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |
| `estado` | `string` | `@IsString` `@IsNotEmpty` |
| `horas` | `number` | `@IsNumber` `@IsNotEmpty` |
| `etapaId` | `string` | `@IsUUID` `@IsNotEmpty` |

`UpdateAsignacioneDto` extiende `PartialType(CreateAsignacioneDto)` — hereda `@Type(() => Date)` + `@IsDate` automáticamente.

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global — rechaza requests sin usuario válido |
| Autorización | `@Roles()` en cada endpoint |
| Multi-tenant | `TenantFilter.getCurrentCentroId()` en `create`, `findAll`, `findById`, `deleteById` |
| RLS PostgreSQL | Suscriptor configura `app.current_centro_id` en cada conexión |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba `CreateAsignacioneDto` desde `infrastructure` | Creados `CreateAsignacionCommand` / `UpdateAsignacionCommand` en `application/dto/` |
| 2 | `findAll()` almacenaba entidades ORM en caché, devolvía entidades de dominio desde BD | Cache ahora almacena entidades de dominio mapeadas |
| 3 | `@IsDateString()` sin `@Type(() => Date)` en fechas | Reemplazado por `@Type(() => Date)` + `@IsDate()` |
