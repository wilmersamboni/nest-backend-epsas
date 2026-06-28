# Módulo: `bitacoras`

## Descripción general

Gestiona las bitácoras de los aprendices. Cada bitácora está ligada a un seguimiento y puede tener un PDF adjunto. Permite crear, listar, actualizar y eliminar bitácoras, así como subir o actualizar el PDF asociado.

---

## Arquitectura hexagonal

```
bitacoras/
├── domain/
│   ├── entities/
│   │   └── bitacora.entity.ts              ← Entidad de dominio pura
│   └── ports/
│       └── bitacora.repository.port.ts     ← Contrato IBitacoraRepository
├── application/
│   ├── bitacoras.service.ts                ← Lógica de negocio
│   └── dto/
│       ├── create-bitacora.command.ts      ← Comando de creación
│       └── update-bitacora.command.ts      ← Comando de actualización (explícito, sin seguimientoId)
└── infrastructure/
    ├── entities/
    │   └── bitacora.orm-entity.ts          ← Entidad TypeORM
    ├── adapters/
    │   └── bitacora.typeorm.repository.ts  ← Implementación del repositorio
    └── http/
        ├── bitacoras.controller.ts         ← Controlador REST
        └── dto/
            ├── create-bitacora.dto.ts      ← DTO de entrada con validación
            └── update-bitacora.dto.ts      ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `Bitacora`

```ts
export class Bitacora {
  id: string;
  fecha: Date;
  bitacora_pdf: string;
  estado: string;
  seguimiento?: { id: string };
}
```

### Puerto `IBitacoraRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data: CreateBitacoraCommand) → Promise<Bitacora>` | Inserta con `centroId` del tenant |
| `findAll` | `() → Promise<Bitacora[]>` | Lista con tenant filter y caché |
| `findById` | `(id: string) → Promise<Bitacora \| null>` | Busca con tenant filter |
| `findBySeguimientoId` | `(seguimientoId: string) → Promise<Bitacora[]>` | Lista por seguimiento |
| `save` | `(b: Bitacora) → Promise<Bitacora>` | Actualiza con tenant filter |
| `deleteById` | `(id: string) → Promise<number>` | Elimina con `{ id, centroId }` |
| `updatePdf` | `(id: string, filename: string) → Promise<void>` | Actualiza solo el PDF con tenant filter |

---

## Capa de aplicación

### Commands

**`create-bitacora.command.ts`**
```ts
export interface CreateBitacoraCommand {
  fecha: Date;
  bitacora_pdf: string;
  estado: string;
  seguimientoId: string;
}
```

**`update-bitacora.command.ts`** — Interfaz explícita (NO `Partial<CreateBitacoraCommand>`) para excluir `seguimientoId`:
```ts
export interface UpdateBitacoraCommand {
  fecha?: Date;
  bitacora_pdf?: string;
  estado?: string;
}
```

### Servicio `BitacorasService`

| Método | Descripción |
|---|---|
| `create(dto)` | Separa `seguimientoId`, construye objeto de dominio y delega al repositorio |
| `findAll()` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `update(id, dto)` | Verifica existencia; solo actualiza `fecha`, `bitacora_pdf`, `estado` — nunca `seguimientoId` |
| `remove(id)` | Lanza `NotFoundException` si `affected === 0` |
| `updatePdf(id, filename)` | Delega a `updatePdf` del repositorio (operación específica) |

---

## Capa de infraestructura

### Repositorio TypeORM `BitacoraTypeOrmRepository`

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`
- `findAll()` / `findById()`: QueryBuilder + `TenantFilter.apply(qb, 'b')`
- `deleteById()`: `this.orm.delete({ id, centroId })` — tenant filter en la eliminación
- `updatePdf()`: QueryBuilder `.andWhere('centroId = :centroId', { centroId })` — tenant filter en la actualización del PDF

### ORM Entity `BitacoraOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `fecha` | `date` | |
| `bitacora_pdf` | `text` | Nombre de archivo relativo |
| `estado` | `text` | |
| `seguimiento` | `ManyToOne` | → `SeguimientoOrmEntity` |

---

## API REST

### Controller `BitacorasController`

**Base path:** `/api2/bitacoras`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin`, `docente` | Crea una nueva bitácora |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todas las bitácoras del tenant |
| `GET` | `/seguimiento/:seguimientoId` | `admin`, `docente`, `estudiante` | Lista bitácoras de un seguimiento |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene una bitácora por UUID |
| `PATCH` | `/:id` | `admin`, `docente` | Actualiza una bitácora |
| `PATCH` | `/:id/pdf` | `admin`, `docente` | Sube o reemplaza el PDF de una bitácora |
| `DELETE` | `/:id` | `admin` | Elimina una bitácora |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### DTO de entrada `CreateBitacoraDto`

| Campo | Tipo | Validación |
|---|---|---|
| `seguimientoId` | `string` | `@IsUUID` `@IsNotEmpty` |
| `fecha` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |
| `bitacora_pdf` | `string` | `@IsString` `@IsOptional` |
| `estado` | `string` | `@IsString` `@IsNotEmpty` |

`UpdateBitacoraDto` extiende `PartialType(CreateBitacoraDto)`.

### Carga de PDF

El endpoint `PATCH /:id/pdf` usa Multer con:
- Destino: `./uploads/bitacoras/`
- Solo acepta `application/pdf`
- Límite: 10 MB

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | `@Roles()` por endpoint |
| Multi-tenant | Tenant filter en `create`, `findAll`, `findById`, `deleteById`, `updatePdf` |
| `seguimientoId` inmutable | `UpdateBitacoraCommand` excluye explícitamente el campo |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba DTOs de `infrastructure` | Creados `CreateBitacoraCommand` / `UpdateBitacoraCommand` en `application/dto/` |
| 2 | `UpdateBitacoraCommand` era `Partial<CreateBitacoraCommand>` (incluía `seguimientoId`) | Refactorizado como interfaz explícita sin `seguimientoId` |
| 3 | `@IsDateString()` sin `@Type(() => Date)` en `fecha` | Reemplazado por `@Type(() => Date)` + `@IsDate()` |
| 4 | `deleteById()` sin filtro de tenant | Cambiado a `this.orm.delete({ id, centroId })` |
| 5 | `updatePdf()` sin filtro de tenant | Añadido `.andWhere('centroId = :centroId', { centroId })` |
