# Módulo: Formatos

## Propósito

Almacena las **plantillas de documentos** del proceso de práctica (actas, bitácoras, etc.). A diferencia de los módulos anteriores, este repositorio **no aplica `TenantFilter` ni `RlsFilter`** en sus consultas de lectura — todos los formatos visibles para cualquier usuario autenticado sin filtro por centro o por rol. El `centroId` solo se asigna al crear el registro.

El módulo también elimina el archivo físico del disco (`unlinkSync`) al borrar un registro, garantizando que no queden ficheros huérfanos.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `formatos.module.ts` | Declara el módulo, registra `MulterModule` con destino `./uploads/formatos` y **exporta** `FormatosService` |
| `infrastructure/http/formatos.controller.ts` | 7 endpoints REST con Multer para subida en el `POST` |
| `application/formatos.service.ts` | CRUD, eliminación de archivo físico, lectura del contexto para `centroId`/`sedeId` |
| `domain/entities/formato.entity.ts` | Entidad de dominio (incluye `centroId` y `sedeId`, a diferencia de otros módulos) |
| `domain/ports/formato.repository.port.ts` | Interfaz `IFormatoRepository` con 8 métodos + token |
| `infrastructure/entities/formato.orm-entity.ts` | Entidad TypeORM con todos los campos de archivo y relación opcional a `EtapaPractica` |
| `infrastructure/adapters/formato.typeorm.repository.ts` | Implementa el repositorio con TypeORM simple (sin TenantFilter, sin caché) |
| `infrastructure/http/dto/create-formato.dto.ts` | Validación de creación + constante `TIPOS_FORMATO` |
| `infrastructure/http/dto/update-formato.dto.ts` | Extiende con todos los campos opcionales |

---

## Entidades

### Dominio: `Formato`

```ts
class Formato {
  id: string;
  centroId: string;         // visible en dominio (a diferencia de Modalidad/Empresa)
  sedeId: string | null;
  tipo: string;
  nombre: string;
  ruta_archivo: string;     // nombre único generado en disco (ej: '1700000000000-xyz.pdf')
  nombre_original: string;  // nombre original del fichero para mostrar en UI
  mime_type: string;
  tamanio: number | null;   // bytes
  estado: string;
  subido_por: string | null; // user.sub del JWT (ID de usuario, no personaId)
  created_at: Date;
  etapa?: { id: string };   // opcional — null si es plantilla global
}
```

> A diferencia de todos los demás módulos, la entidad de dominio **sí expone `centroId` y `sedeId`**. El servicio los lee del `RequestContextService` al crear el registro.

### ORM: `FormatoOrmEntity` — tabla `formato`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `centroId` | `uuid` | Centro de formación |
| `sedeId` | `uuid` (nullable) | Sede opcional |
| `tipo` | `text` | Tipo de formato (ver valores válidos) |
| `nombre` | `text` | Nombre descriptivo del formato |
| `ruta_archivo` | `text` | Nombre de archivo único en disco |
| `nombre_original` | `text` | Nombre original del fichero subido |
| `mime_type` | `text` | default `'application/pdf'` |
| `tamanio` | `bigint` (nullable) | Tamaño en bytes |
| `estado` | `text` | default `'activo'` |
| `subido_por` | `uuid` (nullable) | `sub` del JWT del usuario que subió el archivo |
| `created_at` | `timestamp` | Auto-generado con `@CreateDateColumn` |
| `etapa` | `ManyToOne → EtapaPracticaOrmEntity` | nullable; `onDelete: 'CASCADE'` |

**Tipos válidos** (definidos en `TIPOS_FORMATO` del DTO):
`'acta_seguimiento'`, `'bitacora'`, `'otro'`

> **Discrepancia**: El comentario en la entidad ORM lista tipos adicionales (`'contrato'`, `'acta_inicio'`, `'acta_seguimiento_1'`, `'acta_seguimiento_2'`, `'carta_presentacion'`, `'paz_y_salvo'`, `'certificado'`), pero el DTO solo acepta los 3 valores de `TIPOS_FORMATO`. La BD puede contener registros con los tipos del comentario si fueron creados directamente o con versiones anteriores del DTO.

---

## Puerto: `IFormatoRepository`

```ts
interface IFormatoRepository {
  create(data: Partial<Formato>): Promise<Formato>;
  findAll(): Promise<Formato[]>;
  findById(id: string): Promise<Formato | null>;
  findByEtapaId(etapaId: string): Promise<Formato[]>;
  findByTipo(etapaId: string, tipo: string): Promise<Formato[]>;
  save(formato: Partial<Formato>): Promise<Formato>;
  deleteById(id: string): Promise<number>;
  updateEstado(id: string, estado: string): Promise<void>;
}
// Token: FORMATO_REPOSITORY_PORT
```

---

## Repositorio: `FormatoTypeormRepository`

### Sin TenantFilter, sin RlsFilter, sin caché

A diferencia de los repositorios de otros módulos, este no aplica ningún filtro automático:

| Método | TenantFilter | RlsFilter | Caché |
|---|---|---|---|
| `findAll()` | **No** | **No** | **No** |
| `findById(id)` | **No** | **No** | **No** |
| `findByEtapaId(etapaId)` | **No** | **No** | **No** |
| `findByTipo(etapaId, tipo)` | **No** | **No** | **No** |

`findAll()` usa `repo.find({ relations: ['etapa'] })` directo. `findById()` usa `repo.findOne()`. Solo `findByEtapaId()` y `findByTipo()` filtran — pero por `etapaId`, no por `centroId`.

### `create()` — asignación de tenant manual

El `centroId` y `sedeId` los recibe como parte de `data` (el servicio los inyecta desde el contexto antes de llamar al repositorio).

### `updateEstado()` — UPDATE selectivo

Único método del repositorio que usa `QueryBuilder.update()` para actualizar solo la columna `estado`.

### `save()` — cast a `any`

```ts
const saved = await this.repo.save(formato as any);
```

Usa cast por incompatibilidad de tipos entre `Partial<Formato>` y la entidad TypeORM. Puede sobrescribir cualquier campo incluido `centroId`.

---

## Servicio: `FormatosService`

### `create(dto, file)`

Lee `centroId` y `sedeId` directamente del `RequestContextService` antes de persistir:

```ts
const user = RequestContextService.getUser();
return this.formatoRepository.create({
  centroId:        user?.centroId ?? '',
  sedeId:          user?.sedeId   ?? null,
  tipo:            dto.tipo,
  nombre:          dto.nombre,
  ruta_archivo:    file.filename,       // nombre único generado por Multer
  nombre_original: file.originalname,  // nombre original para mostrar
  mime_type:       file.mimetype,
  tamanio:         file.size,
  estado:          dto.estado ?? 'activo',
  subido_por:      user?.sub ?? null,
  etapa:           dto.etapaId ? { id: dto.etapaId } : undefined,
});
```

### `remove(id)` — eliminación física + lógica

```
1. findOne(id) — valida existencia, lanza NotFoundException si no existe
2. Construye la ruta completa: process.cwd() + '/uploads/formatos/' + formato.ruta_archivo
3. Si el fichero existe en disco → unlinkSync(filePath)
   Si falla el unlinkSync → solo emite log de advertencia, no lanza error
4. deleteById(id) — elimina el registro de la BD
   Si affected === 0 → NotFoundException
```

### `cambiarEstado(id, estado)`

Valida contra `['activo', 'inactivo']`. Lanza `BadRequestException` si el valor no es válido. Llama a `updateEstado()` directamente sin recargar la entidad completa.

### `findByEtapa(etapaId)` y `findByTipo(etapaId, tipo)`

Delegaciones directas al repositorio. Retornan los formatos de una etapa, opcionalmente filtrados por tipo.

---

## Controlador: `FormatosController`

**Prefijo**: `/api2/formatos`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin`, `docente` | Crear formato (multipart con archivo) |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Listar todos |
| `GET` | `/etapa/:etapaId` | `admin`, `docente`, `estudiante` | Listar por etapa (con filtro `?tipo=`) |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener uno |
| `PATCH` | `/:id` | `admin`, `docente` | Actualizar metadatos |
| `PATCH` | `/:id/estado` | `admin`, `docente` | Cambiar estado |
| `DELETE` | `/:id` | `admin` | Eliminar registro + archivo físico |

> **Error tipográfico en decoradores**: En `POST /` y `GET /`, el decorador `@Roles` incluye `'docente'` duplicado: `@Roles('admin', 'docente', 'docente')`. Funciona correctamente (el Guard ignora duplicados) pero debería corregirse.

### Configuración de Multer (`multerOptions`)

Definida como constante en el controlador y reutilizada por `FileInterceptor`:

| Parámetro | Valor |
|---|---|
| Destino | `./uploads/formatos` |
| Nombre de archivo | `{timestamp}-{random}{ext}` |
| Tipos permitidos | `application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Tamaño máximo | **10 MB** |

---

### `POST /api2/formatos`

**Multipart form-data**:

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `file` | archivo | Sí | PDF, imagen o Word (máx 10 MB) |
| `tipo` | string | Sí | `'acta_seguimiento'`, `'bitacora'` o `'otro'` |
| `nombre` | string | Sí | Nombre descriptivo del formato |
| `etapaId` | UUID | No | Si se omite, es un formato/plantilla global |
| `estado` | string | No | default `'activo'` |

**Respuesta exitosa (`201`)**:
```json
{
  "id": "uuid-generado",
  "centroId": "uuid-centro",
  "sedeId": null,
  "tipo": "acta_seguimiento",
  "nombre": "Acta de seguimiento bimestre 1",
  "ruta_archivo": "1700000000000-123456789.pdf",
  "nombre_original": "acta_seguimiento_formato.pdf",
  "mime_type": "application/pdf",
  "tamanio": 204800,
  "estado": "activo",
  "subido_por": "uuid-usuario",
  "created_at": "2024-03-10T14:30:00.000Z",
  "etapa": { "id": "uuid-etapa" }
}
```

---

### `GET /api2/formatos/etapa/:etapaId`

Acepta query param opcional `?tipo=`:

```
GET /api2/formatos/etapa/uuid-etapa            → todos los formatos de la etapa
GET /api2/formatos/etapa/uuid-etapa?tipo=bitacora → solo bitácoras de la etapa
```

Resultados ordenados por `created_at DESC`.

---

### `DELETE /api2/formatos/:id`

Elimina tanto el registro en BD como el archivo en `./uploads/formatos/`. Si el archivo ya no existe en disco, la eliminación del registro procede igualmente (el error de `unlinkSync` solo genera un `warn` en el log).

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `RequestContextService` | Leer `centroId`, `sedeId` y `sub` al crear un formato |
| `MulterModule` | Registro global del destino de uploads en el módulo |

### Externas

Ninguna llamada HTTP a servicios externos.

### Módulos que consumen `FormatosModule`

`FormatosModule` exporta `FormatosService` pero actualmente ningún otro módulo lo importa directamente.

---

## Notas de diseño

- **Sin TenantFilter ni RlsFilter**: Este es el único módulo de negocio que no filtra lecturas por centro ni por rol. Cualquier usuario autenticado puede ver todos los formatos de todos los centros. Si el sistema crece a múltiples centros independientes, esto debe corregirse añadiendo `TenantFilter` en `findAll()` y `findById()`.
- **Formatos globales vs. de etapa**: La relación `etapa` es nullable (`nullable: true` en ORM, `@IsOptional()` en DTO). Un formato sin etapa es una "plantilla global" del centro. La lógica de negocio no diferencia entre ambos tipos más allá de la presencia del `etapaId`.
- **`onDelete: 'CASCADE'`**: Si se elimina una `EtapaPractica`, sus formatos se eliminan en cascada a nivel de BD. Sin embargo, los archivos físicos en `./uploads/formatos/` **no** se eliminan — solo el `remove()` del servicio los borra. La eliminación directa de etapas dejará archivos huérfanos en disco.
- **`subido_por` guarda `sub`, no `personaId`**: A diferencia del campo `instructor` en asignaciones (que guarda `personaId`), aquí se guarda `user.sub` (ID de usuario del sistema de autenticación). Son sistemas de ID diferentes.
