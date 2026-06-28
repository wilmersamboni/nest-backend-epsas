# Módulo: `seguimientos`

## Descripción general

Gestiona los seguimientos de las etapas de práctica. Cada seguimiento agrupa las bitácoras y observaciones de un período concreto. Permite registrar el estado, las actas (PDF), y consultar los seguimientos de un aprendiz consultando su historial de matrículas en el microservicio ERP externo. Es el módulo con más dependencias externas del sistema.

---

## Arquitectura hexagonal

```
seguimientos/
├── domain/
│   ├── entities/
│   │   └── seguimiento.entity.ts              ← Entidad de dominio pura
│   └── ports/
│       ├── seguimiento.repository.port.ts     ← Contrato ISeguimientoRepository
│       └── matricula.service.port.ts          ← Contrato IMatriculaServicePort
├── application/
│   ├── seguimientos.service.ts                ← Lógica de negocio
│   └── dto/
│       ├── create-seguimiento.command.ts      ← Comando de creación
│       └── update-seguimiento.command.ts      ← Interfaz explícita (sin etapaId/asignacionId)
└── infrastructure/
    ├── entities/
    │   └── seguimiento.orm-entity.ts          ← Entidad TypeORM
    ├── adapters/
    │   ├── seguimiento.typeorm.repository.ts  ← Implementación del repositorio
    │   └── matricula.http.adapter.ts          ← Adapter HTTP hacia el ERP externo
    └── http/
        ├── seguimientos.controller.ts         ← Controlador REST
        └── dto/
            ├── create-seguimiento.dto.ts      ← DTO de entrada con validación
            └── update-seguimiento.dto.ts      ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `Seguimiento`

```ts
export class Seguimiento {
  id: string;
  actas_pdf: string;
  estado: string;
  observacion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  etapa?: { id: string };
  asignacion?: { id: string };
  bitacoras?: { id: string; fecha: Date; estado: string }[];
}
```

### Puerto `ISeguimientoRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data: Partial<Seguimiento> & { etapa: { id: string }; asignacion?: { id: string } }) → Promise<Seguimiento>` | Inserta con `centroId` del tenant |
| `findAll` | `() → Promise<Seguimiento[]>` | Lista con tenant filter y caché |
| `findById` | `(id: string) → Promise<Seguimiento \| null>` | Busca con tenant filter |
| `save` | `(s: Seguimiento) → Promise<Seguimiento>` | Actualiza con tenant filter |
| `updateEstado` | `(id, estado) → Promise<void>` | Actualiza solo el estado con tenant filter |
| `updateActas` | `(id, filename) → Promise<void>` | Actualiza solo el PDF del acta con tenant filter |
| `remove` | `(s: Seguimiento) → Promise<void>` | Elimina con `{ id, centroId }` |
| `findByMatriculaIds` | `(ids: string[]) → Promise<Seguimiento[]>` | Lista seguimientos de varias matrículas con tenant filter |
| `findByEtapaId` | `(etapaId: string) → Promise<Seguimiento[]>` | Lista seguimientos de una etapa, ordenados por `fecha_inicio DESC` |

### Puerto `IMatriculaServicePort`

```ts
export interface IMatriculaServicePort {
  listarPorAlumno(idAlumno: string): Promise<any[]>;
}
```

El token JWT **no se pasa como parámetro** — el adapter lo obtiene internamente desde `RequestContextService.getRawToken()`.

---

## Capa de aplicación

### Commands

**`create-seguimiento.command.ts`**
```ts
export interface CreateSeguimientoCommand {
  actas_pdf?: string;
  estado?: string;
  observacion?: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  etapaId: string;
  asignacionId: string;
}
```

**`update-seguimiento.command.ts`** — Explícito, sin `etapaId` ni `asignacionId`:
```ts
export interface UpdateSeguimientoCommand {
  actas_pdf?: string;
  estado?: string;
  observacion?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}
```

### Servicio `SeguimientosService`

| Método | Descripción |
|---|---|
| `create(dto)` | Separa `etapaId`/`asignacionId`, construye el objeto de dominio y delega al repositorio |
| `findAll()` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `update(id, dto)` | Verifica existencia; delega a `save()` del repositorio con tenant filter |
| `remove(id)` | Verifica existencia; delega a `remove()` del repositorio con tenant filter |
| `findByEtapaId(etapaId)` | Delega al repositorio |
| `listarSeguimientoPorAlumno(idAlumno)` | Consulta matrículas al ERP; luego busca seguimientos por los IDs obtenidos |
| `cambiarEstado(id, estado)` | Verifica existencia; delega a `updateEstado()` |
| `subirActa(id, filename)` | Verifica existencia; delega a `updateActas()` |
| `createInternal(data)` | Método para uso interno (otros módulos pueden crear seguimientos sin pasar por el controller) |

---

## Capa de infraestructura

### Repositorio TypeORM `SeguimientoTypeOrmRepository`

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`; mapea explícitamente todos los campos (sin `...data` con `any`)
- `findAll()` / `findById()`: QueryBuilder + `TenantFilter.apply(qb, 's')` + `RlsFilter.applySeguimiento(qb, 's')` + caché
- `findByEtapaId()`: QueryBuilder + `TenantFilter` + `RlsFilter` + `ORDER BY s.fecha_inicio DESC`
- `findByMatriculaIds()`: JOIN a `etapa.matriculaId IN (:...ids)` + `TenantFilter` + `RlsFilter` + caché por combinación de IDs
- `save()`: QueryBuilder + `.andWhere('centroId = :centroId', { centroId })`; solo actualiza campos presentes
- `updateEstado()`: QueryBuilder + `.update(SeguimientoOrmEntity)` + `.andWhere('centroId = :centroId', { centroId })`
- `updateActas()`: QueryBuilder + `.andWhere('centroId = :centroId', { centroId })`
- `remove()`: `this.orm.delete({ id: seguimiento.id, centroId })` — tenant filter autocontenido

### Adapter HTTP `MatriculaHttpAdapter`

```ts
async listarPorAlumno(idAlumno: string): Promise<any[]> {
  const token = RequestContextService.getRawToken();   // ← token obtenido internamente
  const response = await this.httpService.get(
    `${ERP_API_URL}/matriculas/persona/${idAlumno}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
}
```

Si el ERP responde 404, devuelve `[]` en lugar de lanzar un error.

### ORM Entity `SeguimientoOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `actas_pdf` | `text nullable` | Nombre del archivo PDF del acta |
| `estado` | `text` | Estado del seguimiento |
| `observacion` | `text` | Observación general |
| `fecha_inicio` | `date` | |
| `fecha_fin` | `date` | |
| `etapa` | `ManyToOne` | → `EtapaPracticaOrmEntity` |
| `asignacion` | `ManyToOne` | → `AsignacionOrmEntity` |
| `bitacoras` | `OneToMany` | → `BitacoraOrmEntity` |
| `observaciones` | `OneToMany` | → `ObservacionOrmEntity` |

---

## API REST

### Controller `SeguimientosController`

**Base path:** `/api2/seguimientos`

Orden de rutas (las específicas antes de las genéricas para evitar conflictos en Express):

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crea un nuevo seguimiento |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todos los seguimientos del tenant |
| `GET` | `/etapa/:id` | `admin`, `docente`, `estudiante` | Lista seguimientos de una etapa |
| `GET` | `/alumno/:id` | `admin`, `docente`, `estudiante` | Lista seguimientos de un alumno (consulta ERP) |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene un seguimiento por UUID |
| `PATCH` | `/:id` | `admin`, `docente` | Actualiza un seguimiento |
| `PATCH` | `/:id/estado` | `admin`, `docente` | Cambia solo el estado |
| `PATCH` | `/:id/acta` | `admin`, `docente` | Sube el PDF del acta (multipart/form-data) |
| `DELETE` | `/:id` | `admin` | Elimina un seguimiento |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### DTO de entrada `CreateSeguimientoDto`

| Campo | Tipo | Validación |
|---|---|---|
| `actas_pdf` | `string` | `@IsString` `@IsOptional` |
| `estado` | `string` | `@IsIn(['activo','inactivo','pendiente'])` `@IsOptional` |
| `observacion` | `string` | `@IsString` `@IsOptional` |
| `fecha_inicio` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |
| `fecha_fin` | `Date` | `@Type(() => Date)` `@IsDate` `@IsNotEmpty` |
| `etapaId` | `string` | `@IsUUID` `@IsNotEmpty` |
| `asignacionId` | `string` | `@IsUUID` `@IsNotEmpty` |

`UpdateSeguimientoDto` extiende `PartialType(CreateSeguimientoDto)` — hereda `@Type(() => Date)` + `@IsDate` automáticamente.

### Carga de actas

Multer configurado con:
- Destino: `./uploads/actas/`
- Solo acepta `application/pdf`
- Responde con `{ id, actas_pdf: filename }`

---

## Dependencias entre módulos

```
SeguimientosModule
  ├── imports: HttpModule (para MatriculaHttpAdapter)
  └── exports: SeguimientosService
               (usado por ObservacionesModule para createParaEtapa)
```

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | Creación y eliminación solo `admin`; actualización para `admin` y `docente` |
| Multi-tenant | Tenant filter en **todas** las operaciones de repositorio (create, save, updateEstado, updateActas, remove, findAll, findById, findByEtapaId, findByMatriculaIds) |
| RLS PostgreSQL | `RlsFilter.applySeguimiento` en todas las consultas de lectura |
| Token JWT | El adapter HTTP obtiene el token internamente — no se expone como parámetro en el servicio ni el controller |
| `etapaId`/`asignacionId` inmutables | `UpdateSeguimientoCommand` los excluye explícitamente |
| Orden de rutas | Rutas específicas declaradas antes de `/:id` para evitar captura prematura por Express |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba DTOs de `infrastructure` | Creados `CreateSeguimientoCommand` / `UpdateSeguimientoCommand` en `application/dto/` |
| 2 | `@IsDateString()` sin `@Type(() => Date)` en `fecha_inicio`/`fecha_fin` | Reemplazado por `@Type(() => Date)` + `@IsDate()` |
| 3 | `updateEstado()` sin filtro de tenant | Añadido `.andWhere('centroId = :centroId', { centroId })` |
| 4 | `updateActas()` sin filtro de tenant | Añadido `.andWhere('centroId = :centroId', { centroId })` |
| 5 | `save()` sin filtro de tenant | Añadido `.andWhere('centroId = :centroId', { centroId })` |
| 6 | `remove()` usaba `orm.remove(orm.create(seguimiento))` — sin tenant filter | Cambiado a `this.orm.delete({ id: seguimiento.id, centroId })` |
| 7 | `ParseUUIDPipe` faltante en `GET /:id` | Añadido `@Param('id', ParseUUIDPipe)` |
| 8 | `ParseUUIDPipe` faltante en `GET /alumno/:id` | Añadido `@Param('id', ParseUUIDPipe)` |
| 9 | `create()` del repositorio usaba `any` en la firma | Tipado con `Partial<Seguimiento> & { etapa: { id: string }; asignacion?: { id: string } }` |
| 10 | El token JWT se pasaba como parámetro desde el controller hasta el adapter pasando por el servicio | Token eliminado de todos los parámetros; el adapter lo obtiene con `RequestContextService.getRawToken()` |
| 11 | Rutas `GET /etapa/:id` y `GET /alumno/:id` declaradas después de `GET /:id` | Reordenadas: específicas primero, genérica al final |
| 12 | `findByEtapaId` sin `ORDER BY` — orden de seguimientos no determinista | Añadido `ORDER BY s.fecha_inicio DESC` |
