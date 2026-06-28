# Módulo: `documento-practica`

## Descripción general

Gestiona los documentos de práctica asociados a los aprendices. Permite subir, listar y eliminar archivos (PDF, Word, imágenes) vinculados a una etapa de práctica. Los archivos se almacenan en disco y los metadatos en la base de datos.

---

## Arquitectura hexagonal

```
documentos-practica/
├── domain/
│   ├── entities/
│   │   └── documento-practica.entity.ts           ← Entidad de dominio pura
│   └── ports/
│       └── documento-practica.repository.port.ts  ← Contrato IDocumentoPracticaRepository
├── application/
│   └── documento-practica.service.ts              ← Lógica de negocio
└── infrastructure/
    ├── entities/
    │   └── documento-practica.orm-entity.ts        ← Entidad TypeORM
    ├── adapters/
    │   └── documento-practica.typeorm.repository.ts
    └── http/
        ├── documento-practica.controller.ts
        └── dto/
            └── response-documento.dto.ts           ← DTO de respuesta (excluye ruta física)
```

---

## Capa de dominio

### Entidad `DocumentoPractica`

```ts
export class DocumentoPractica {
  id: string;
  nombre: string;
  nombre_archivo: string;
  ruta: string;
  tipo_mime: string;
  tamanio: number;
  etapa?: { id: string };
}
```

### Puerto `IDocumentoPracticaRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data) → Promise<DocumentoPractica>` | Inserta con `centroId` del tenant |
| `findAll` | `() → Promise<DocumentoPractica[]>` | Lista con tenant filter |
| `findByEtapaId` | `(etapaId: string) → Promise<DocumentoPractica[]>` | Lista documentos de una etapa |
| `findById` | `(id: string) → Promise<DocumentoPractica \| null>` | Busca con tenant filter |
| `deleteById` | `(id: string) → Promise<number>` | Elimina con `{ id, centroId }` |

---

## Capa de aplicación

### Servicio `DocumentoPracticaService`

| Método | Descripción |
|---|---|
| `create(file, etapaId)` | Guarda metadatos del archivo y lo asocia a la etapa. Asigna `centroId` del tenant |
| `findAll()` | Delega al repositorio |
| `findByEtapa(etapaId)` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `remove(id)` | Verifica existencia, elimina el archivo físico con `unlinkSync` y luego elimina el registro |

---

## Capa de infraestructura

### Repositorio TypeORM

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`
- `findAll()` / `findByEtapaId()` / `findById()`: QueryBuilder + `TenantFilter.apply(qb, 'd')`
- `deleteById()`: `this.orm.delete({ id, centroId })` — tenant filter en la eliminación

### ORM Entity `DocumentoPracticaOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `nombre` | `text` | Nombre descriptivo del documento |
| `nombre_archivo` | `text` | Nombre del archivo en disco |
| `ruta` | `text` | Ruta relativa en el servidor |
| `tipo_mime` | `text` | MIME type del archivo |
| `tamanio` | `int` | Tamaño en bytes |
| `etapa` | `ManyToOne` | → `EtapaPracticaOrmEntity` |

---

## API REST

### Controller `DocumentoPracticaController`

**Base path:** `/api2/documentos-practica`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin`, `docente` | Sube un documento (multipart/form-data) |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todos los documentos del tenant |
| `GET` | `/etapa/:etapaId` | `admin`, `docente`, `estudiante` | Lista documentos de una etapa |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene un documento por UUID |
| `DELETE` | `/:id` | `admin`, `docente` | Elimina un documento y su archivo físico |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### Carga de archivos

Multer configurado con:
- Destino: `./uploads/documentos/`
- Tipos permitidos: PDF, JPEG, PNG, DOC, DOCX
- Límite: 10 MB
- fileFilter usa `mimetype` (no extensión) para mayor seguridad

### Respuesta `ResponseDocumentoDto`

El controller aplica un mapper `toResponse()` que excluye los campos sensibles de infraestructura:

```ts
// Campos excluidos de la respuesta pública:
// - ruta       (ruta física en el servidor)
// - nombre_archivo (nombre interno del archivo)

// Campos incluidos:
// id, nombre, tipo_mime, tamanio, etapa
```

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | `DELETE` restringido a `admin` y `docente`; lectura abierta a todos los roles |
| Multi-tenant | Tenant filter en todas las operaciones de repositorio |
| Rutas físicas | `ruta` y `nombre_archivo` no se exponen en las respuestas de la API |
| Filtro de archivos | Validación por `mimetype` (no solo extensión) |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | `DELETE /:id` no tenía `@Roles()` — cualquier usuario autenticado podía eliminar documentos | Añadido `@Roles('admin', 'docente')` |
| 2 | `ResponseDocumentoDto` existía pero nunca se usaba — la respuesta exponía `ruta` y `nombre_archivo` | Añadido mapper privado `toResponse()` en el controller |
| 3 | `fileFilter` usaba regex sobre `file.originalname` sin anclar el inicio — vulnerable a `malicioso.pdf.exe` | Reemplazado por validación de `mimetype` contra lista blanca |
