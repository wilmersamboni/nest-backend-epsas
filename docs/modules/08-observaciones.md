# Módulo: `observaciones`

## Descripción general

Gestiona las observaciones registradas durante los seguimientos de práctica. Cada observación pertenece a un seguimiento y puede incluir una fotografía como evidencia. Ofrece dos formas de crear observaciones: directamente sobre un seguimiento conocido, o automáticamente sobre el seguimiento más reciente de una etapa.

---

## Arquitectura hexagonal

```
observaciones/
├── domain/
│   ├── entities/
│   │   └── observacion.entity.ts              ← Entidad de dominio pura
│   └── ports/
│       └── observacion.repository.port.ts     ← Contrato IObservacionRepository + CreateObservacionData
├── application/
│   ├── observaciones.service.ts               ← Lógica de negocio
│   └── dto/
│       ├── create-observacion.command.ts      ← Dos interfaces: CreateObservacionCommand + CreateObservacionParaEtapaCommand
│       └── update-observacion.command.ts      ← Interfaz explícita sin seguimientoId
└── infrastructure/
    ├── entities/
    │   └── observacion.orm-entity.ts           ← Entidad TypeORM
    ├── adapters/
    │   └── observacion.typeorm.repository.ts   ← Implementación del repositorio
    └── http/
        ├── observaciones.controller.ts         ← Controlador REST
        └── dto/
            ├── create-observacione.dto.ts      ← DTO de creación directa
            ├── create-observacion-para-etapa.dto.ts ← DTO para la ruta /etapa/:etapaId
            └── update-observacione.dto.ts      ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `Observacion`

```ts
export class Observacion {
  id: string;
  fecha: Date;
  descripcion: string;
  evidencia_foto: string;
  persona: string;
  seguimiento?: { id: string };
}
```

### Puerto `IObservacionRepository`

```ts
export interface CreateObservacionData {
  fecha: Date;
  descripcion: string;
  evidencia_foto?: string;
  persona: string;
  seguimiento: { id: string };
}

export interface IObservacionRepository {
  create(data: CreateObservacionData): Promise<Observacion>;
  findAll(): Promise<Observacion[]>;
  findById(id: string): Promise<Observacion | null>;
  findByEtapaId(etapaId: string): Promise<Observacion[]>;
  findBySeguimientoId(seguimientoId: string): Promise<Observacion[]>;
  save(o: Observacion): Promise<Observacion>;
  deleteById(id: string): Promise<number>;
}
```

`CreateObservacionData` define el contrato de dominio — sin `any`, sin tipos de infraestructura.

---

## Capa de aplicación

### Commands

**`create-observacion.command.ts`**
```ts
export interface CreateObservacionCommand {
  seguimientoId: string;
  fecha: Date;
  descripcion: string;
  evidencia_foto?: string;
  persona: string;
}

export interface CreateObservacionParaEtapaCommand {
  descripcion: string;
  persona: string;
  fecha: Date;
}
```

**`update-observacion.command.ts`** — Explícito, sin `seguimientoId`:
```ts
export interface UpdateObservacionCommand {
  fecha?: Date;
  descripcion?: string;
  evidencia_foto?: string;
  persona?: string;
}
```

### Servicio `ObservacionesService`

| Método | Descripción |
|---|---|
| `create(dto)` | Separa `seguimientoId`, construye `CreateObservacionData` y delega al repositorio |
| `createParaEtapa(etapaId, data)` | Obtiene los seguimientos de la etapa, ordena por `fecha_inicio DESC` (determinista), usa el primero; lanza `BadRequestException` si no hay seguimientos |
| `findAll()` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `findByEtapa(etapaId)` | Delega a `findByEtapaId` del repositorio |
| `findBySeguimiento(seguimientoId)` | Delega a `findBySeguimientoId` del repositorio |
| `update(id, dto)` | Verifica existencia, luego delega al `save()` del repositorio con tenant filter |
| `remove(id)` | Lanza `NotFoundException` si `affected === 0` |

**Nota:** `createParaEtapa` ordena los seguimientos por `fecha_inicio DESC` antes de seleccionar el más reciente, garantizando un resultado determinista independientemente del orden devuelto por el repositorio.

---

## Capa de infraestructura

### Repositorio TypeORM `ObservacionTypeOrmRepository`

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`; `evidencia_foto ?? ''` (fallback seguro)
- `findAll()` / `findById()`: QueryBuilder + `TenantFilter.apply(qb, 'o')` + `RlsFilter.applyObservacion(qb, 'o')` + caché
- `findByEtapaId()`: join a través de `seguimiento.etapa` + `TenantFilter` + `RlsFilter`
- `findBySeguimientoId()`: join a `seguimiento` + `TenantFilter` + `RlsFilter`
- `save()`: QueryBuilder explícito con `.andWhere('centroId = :centroId', { centroId })`; solo actualiza `fecha`, `descripcion`, `evidencia_foto`, `persona`
- `deleteById()`: `this.orm.delete({ id, centroId })` — tenant filter en la eliminación

### ORM Entity `ObservacionOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `fecha` | `date` | |
| `descripcion` | `text` | |
| `evidencia_foto` | `text` | `default: ''` — evita NOT NULL violation si el cliente omite el campo |
| `persona` | `text` | UUID del responsable (almacenado como texto) |
| `seguimiento` | `ManyToOne` | → `SeguimientoOrmEntity` |

---

## API REST

### Controller `ObservacionesController`

**Base path:** `/api2/observaciones`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/upload/evidencia` | `admin`, `docente` | Sube una foto de evidencia; devuelve URL pública |
| `POST` | `/` | `admin`, `docente` | Crea una observación sobre un seguimiento específico |
| `POST` | `/etapa/:etapaId` | `admin`, `docente` | Crea una observación en el seguimiento más reciente de la etapa |
| `GET` | `/etapa/:etapaId` | `admin`, `docente`, `estudiante` | Lista todas las observaciones de los seguimientos de una etapa |
| `GET` | `/seguimiento/:seguimientoId` | `admin`, `docente`, `estudiante` | Lista observaciones de un seguimiento específico |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todas las observaciones del tenant |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene una observación por UUID |
| `PATCH` | `/:id` | `admin`, `docente` | Actualiza una observación |
| `DELETE` | `/:id` | `admin` | Elimina una observación |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### DTOs de entrada

**`CreateObservacioneDto`**

| Campo | Tipo | Validación |
|---|---|---|
| `seguimientoId` | `string` | `@IsUUID` `@IsNotEmpty` |
| `fecha` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |
| `descripcion` | `string` | `@IsString` `@IsNotEmpty` |
| `evidencia_foto` | `string` | `@IsString` `@IsOptional` |
| `persona` | `string` | `@IsUUID` `@IsNotEmpty` |

**`CreateObservacionParaEtapaDto`**

| Campo | Tipo | Validación |
|---|---|---|
| `descripcion` | `string` | `@IsString` `@IsNotEmpty` |
| `persona` | `string` | `@IsUUID` `@IsNotEmpty` |
| `fecha` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |

### Carga de fotos de evidencia

Multer configurado con:
- Destino: `./uploads/observaciones/`
- Tipos permitidos: `.jpg`, `.jpeg`, `.png`, `.webp`
- Límite: 5 MB
- La URL pública se devuelve como `{ url: '/uploads/observaciones/{filename}' }`

---

## Dependencias entre módulos

```
ObservacionesModule
  └── imports: SeguimientosModule
               (para inyectar SeguimientosService en createParaEtapa)
```

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | Eliminación solo `admin`; creación y subida para `admin` y `docente`; lectura para todos |
| Multi-tenant | Tenant filter en todas las operaciones del repositorio |
| RLS PostgreSQL | `RlsFilter.applyObservacion` en todas las consultas de lectura |
| `seguimientoId` inmutable | `UpdateObservacionCommand` no incluye `seguimientoId` |
| `evidencia_foto` | `default: ''` en la columna evita NOT NULL violation si se omite |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba DTOs de `infrastructure` | Creados `CreateObservacionCommand`, `CreateObservacionParaEtapaCommand`, `UpdateObservacionCommand` en `application/dto/` |
| 2 | Port usaba `create(data: any)` | Definida interfaz `CreateObservacionData` en el puerto; sin `any` |
| 3 | `@IsDateString()` sin `@Type(() => Date)` en `fecha` | Reemplazado por `@Type(() => Date)` + `@IsDate()` |
| 4 | `evidencia_foto` opcional en DTO pero `NOT NULL` en BD → 500 si se omite | Añadido `default: ''` en la ORM entity; repositorio usa `evidencia_foto ?? ''` |
| 5 | `deleteById()` sin filtro de tenant | Cambiado a `this.orm.delete({ id, centroId })` |
| 6 | `save()` sin filtro de tenant (usaba `orm.save(orm.create(o))`) | Reescrito con QueryBuilder + `.andWhere('centroId = :centroId', { centroId })` |
| 7 | `createParaEtapa` body sin class-validator — `{ descripcion, persona, fecha }` sin DTO | Creado `CreateObservacionParaEtapaDto` con validación completa |
| 8 | Último seguimiento tomado sin orden garantizado (`seguimientos[length-1]`) | Añadido `sort()` por `fecha_inicio DESC` antes de seleccionar el primero |
| 9 | Imports muertos en el controller (`IsNotEmpty`, `IsUUID` de class-validator) | Eliminados |
