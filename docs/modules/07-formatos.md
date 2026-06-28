# Módulo: `formatos`

## Descripción general

Gestiona los documentos y formatos (plantillas, contratos, actas, etc.) asociados a etapas de práctica. Permite subir archivos (PDF, imágenes, Word), listarlos por etapa y tipo, cambiar su estado y eliminarlos. Los archivos se almacenan en disco; los metadatos en base de datos.

---

## Arquitectura hexagonal

```
formatos/
├── domain/
│   ├── entities/
│   │   └── formato.entity.ts              ← Entidad de dominio pura (sin centroId/sedeId)
│   └── ports/
│       └── formato.repository.port.ts     ← Contrato IFormatoRepository
├── application/
│   ├── formatos.service.ts                ← Lógica de negocio
│   └── dto/
│       ├── create-formato.command.ts      ← Comando de creación (solo campos de negocio)
│       └── update-formato.command.ts      ← Partial del comando de creación
└── infrastructure/
    ├── entities/
    │   └── formato.orm-entity.ts          ← Entidad TypeORM (con centroId/sedeId)
    ├── adapters/
    │   └── formato.typeorm.repository.ts  ← Implementación del repositorio
    └── http/
        ├── formatos.controller.ts         ← Controlador REST (multipart/form-data)
        └── dto/
            ├── create-formato.dto.ts      ← DTO de entrada
            └── update-formato.dto.ts      ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `Formato`

```ts
export class Formato {
  id: string;
  tipo: string;
  nombre: string;
  ruta_archivo: string;
  nombre_original: string;
  mime_type: string;
  tamanio: number | null;
  estado: string;
  subido_por: string | null;
  created_at: Date;
  etapa?: { id: string };
}
```

`centroId` y `sedeId` **no forman parte de la entidad de dominio** — son columnas de infraestructura gestionadas exclusivamente por el repositorio.

### Puerto `IFormatoRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data: Partial<Formato>) → Promise<Formato>` | Inserta con `centroId` del tenant |
| `findAll` | `() → Promise<Formato[]>` | Lista con tenant filter |
| `findById` | `(id: string) → Promise<Formato \| null>` | Busca con tenant filter |
| `findByEtapaId` | `(etapaId: string) → Promise<Formato[]>` | Lista formatos de una etapa |
| `findByTipo` | `(etapaId, tipo) → Promise<Formato[]>` | Filtra por tipo dentro de una etapa |
| `save` | `(f: Partial<Formato>) → Promise<Formato>` | Actualiza campos permitidos con tenant filter |
| `deleteById` | `(id: string) → Promise<number>` | Elimina con `{ id, centroId }` |
| `updateEstado` | `(id, estado) → Promise<void>` | Actualiza solo el estado con tenant filter |

---

## Capa de aplicación

### Commands

**`create-formato.command.ts`** — Solo campos de negocio, sin metadatos de archivo:
```ts
export interface CreateFormatoCommand {
  etapaId?: string;
  tipo: string;
  nombre: string;
  estado?: string;
}
```

**`update-formato.command.ts`**
```ts
export type UpdateFormatoCommand = Partial<CreateFormatoCommand>;
```

Los metadatos del archivo (`ruta_archivo`, `nombre_original`, `mime_type`, `tamanio`) los aporta `Express.Multer.File` directamente en el controller — no forman parte del Command.

### Servicio `FormatosService`

| Método | Descripción |
|---|---|
| `create(dto, file)` | Combina el Command (negocio) con los metadatos de Multer; `centroId` lo asigna el repositorio |
| `findAll()` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `findByEtapa(etapaId)` | Delega al repositorio |
| `findByTipo(etapaId, tipo)` | Delega al repositorio |
| `update(id, dto)` | Verifica existencia, delega a `save()` del repositorio |
| `cambiarEstado(id, estado)` | Valida que `estado` sea `'activo'` o `'inactivo'`; delega a `updateEstado()` |
| `remove(id)` | Verifica existencia, elimina el archivo físico con `unlinkSync` y luego el registro |

---

## Capa de infraestructura

### Repositorio TypeORM `FormatoTypeormRepository`

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`; `sedeId: null`
- `findAll()` / `findById()` / `findByEtapaId()` / `findByTipo()`: QueryBuilder + `TenantFilter.apply(qb, 'f')`
- `save()`: QueryBuilder explícito con `.andWhere('centroId = :centroId', { centroId })`; solo actualiza `tipo`, `nombre`, `estado`
- `deleteById()`: `this.orm.delete({ id, centroId })`
- `updateEstado()`: QueryBuilder + `.andWhere('centroId = :centroId', { centroId })`

### ORM Entity `FormatoOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `tipo` | `text` | Categoría del documento (ej: `contrato`, `acta`) |
| `nombre` | `text` | Nombre descriptivo |
| `ruta_archivo` | `text` | Nombre del archivo en `./uploads/formatos/` |
| `nombre_original` | `text` | Nombre original del archivo subido |
| `mime_type` | `text` | MIME type |
| `tamanio` | `int nullable` | Tamaño en bytes |
| `estado` | `text` | `'activo'` \| `'inactivo'` |
| `subido_por` | `text nullable` | UUID del usuario que subió el archivo |
| `created_at` | `timestamp` | Fecha de subida |
| `etapa` | `ManyToOne nullable` | → `EtapaPracticaOrmEntity` |

---

## API REST

### Controller `FormatosController`

**Base path:** `/api2/formatos`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin`, `docente` | Sube un formato (multipart/form-data) |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todos los formatos del tenant |
| `GET` | `/etapa/:etapaId` | `admin`, `docente`, `estudiante` | Lista formatos de una etapa; acepta `?tipo=` para filtrar |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene un formato por UUID |
| `PATCH` | `/:id` | `admin`, `docente` | Actualiza `tipo`, `nombre` o `estado` |
| `PATCH` | `/:id/estado` | `admin`, `docente` | Cambia solo el estado (`activo` \| `inactivo`) |
| `DELETE` | `/:id` | `admin` | Elimina el formato y su archivo físico |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### Carga de archivos

Multer configurado con:
- Destino: `./uploads/formatos/`
- Tipos permitidos (por `mimetype`): `application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Límite: 10 MB
- Filename: `{timestamp}-{random}{extension}`

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | Eliminación solo `admin`; subida y edición para `admin` y `docente`; lectura para todos |
| Multi-tenant | `centroId` asignado en `create()`; presente en todos los WHERE de mutaciones y consultas |
| `centroId` en dominio | La entidad de dominio NO expone `centroId` — es transparente para la capa de aplicación |
| Validación de archivos | Por `mimetype` (no extensión) contra lista blanca |
| Estado controlado | `cambiarEstado` valida que el valor sea `'activo'` o `'inactivo'` antes de persistir |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba DTOs de `infrastructure` | Creados `CreateFormatoCommand` / `UpdateFormatoCommand` en `application/dto/` |
| 2 | `findAll()` y `findById()` retornaban datos de **todos** los centros (fuga de datos entre tenants) | Convertidos a QueryBuilder con `TenantFilter.apply(qb, 'f')` |
| 3 | `deleteById()` sin filtro de tenant | Cambiado a `this.orm.delete({ id, centroId })` |
| 4 | `save()` y `updateEstado()` sin filtro de tenant | Añadido `.andWhere('centroId = :centroId', { centroId })` en ambos |
| 5 | El servicio leía `centroId` del contexto y lo pasaba al repositorio (responsabilidad incorrecta) | El repositorio llama `TenantFilter.getCurrentCentroId()` internamente |
| 6 | `centroId` y `sedeId` presentes en la entidad de dominio `Formato` | Eliminados — solo existen en la ORM entity |
| 7 | `@Roles('admin','docente','docente')` — `'docente'` duplicado en varios endpoints | Duplicados eliminados |
| 8 | `handleDBExceptions` privado nunca llamado en el servicio | Eliminado |
| 9 | `findByEtapaId()` y `findByTipo()` sin tenant filter | Añadido `TenantFilter.apply(qb, 'f')` |
