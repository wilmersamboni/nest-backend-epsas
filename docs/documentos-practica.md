# Módulo: Documentos Práctica

## Propósito

Gestiona los **documentos adjuntos a una etapa práctica** (contratos, certificados, evidencias, etc.). Es el único módulo con una **ruta anidada** (`/etapas-practicas/:etapaId/documentos`), lo que refleja que un documento siempre pertenece a una etapa. Permite subir hasta **20 archivos en un solo request** y descargar cualquier documento con su nombre original.

Al igual que `formatos`, no aplica `TenantFilter` ni `RlsFilter` y ningún endpoint tiene `@Roles()`.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `documento-practica.module.ts` | Declara el módulo, registra `MulterModule` con destino `./uploads/documentos` y **exporta** `DocumentosService` |
| `infrastructure/http/documento-practica.controller.ts` | 4 endpoints bajo ruta anidada, con subida múltiple y descarga directa |
| `application/documento-practica.service.ts` | Lógica de guardado en batch, listado, obtención y eliminación con borrado físico |
| `domain/entities/documento-practica.entity.ts` | Entidad de dominio pura |
| `domain/ports/documento-practica.repository.ts` | Interfaz `IDocumentoRepository` con 4 métodos + token |
| `infrastructure/entities/documento-practica.orm-entity.ts` | Entidad TypeORM con columna `etapaId` y relación `ManyToOne` a `EtapaPractica` |
| `infrastructure/adapters/documento-practica.typeorm.repository.ts` | Implementa el repositorio con TypeORM simple (sin filtros ni caché) |
| `infrastructure/http/dto/upload-documento.dto.ts` | DTO con `descripcion` opcional (no persiste en BD) |
| `infrastructure/http/dto/params-documento.dto.ts` | DTOs para validar parámetros de ruta como UUID |
| `infrastructure/http/dto/response-documento.dto.ts` | Forma de la respuesta (documentación; no usada en el código actual) |

---

## Entidades

### Dominio: `Documento`

```ts
class Documento {
  id: string;
  etapaId: string;
  nombre_original: string;  // nombre del fichero tal como lo subió el usuario
  nombre_archivo: string;   // nombre UUID generado en disco
  ruta: string;             // ruta relativa: 'uploads/documentos/{uuid}.ext'
  tipo_mime: string;
  tamanio: number;          // bytes
  creado_en: Date;
}
```

### ORM: `DocumentoOrmEntity` — tabla `documento`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `etapaId` | `uuid` | Columna directa con el ID de la etapa (sin JOIN) |
| `nombre_original` | `text` | Nombre original del fichero (para mostrar y para descarga) |
| `nombre_archivo` | `text` | Nombre UUID generado en disco |
| `ruta` | `text` | Ruta relativa: `uploads/documentos/{uuid}.ext` |
| `tipo_mime` | `text` | MIME type del archivo |
| `tamanio` | `int` | Tamaño en bytes |
| `creado_en` | `timestamp` | Auto-generado con `@CreateDateColumn` |
| `etapa` | `ManyToOne → EtapaPracticaOrmEntity` | `onDelete: 'CASCADE'` |

> La entidad tiene tanto la columna `etapaId` (UUID raw) como la relación `etapa` (ManyToOne). Consultas simples usan la columna directa; el JOIN solo se usa cuando se necesita el objeto `EtapaPractica` completo.

---

## Puerto: `IDocumentoRepository`

```ts
interface IDocumentoRepository {
  guardarVarios(documentos: Partial<Documento>[]): Promise<Documento[]>;
  findByEtapaId(etapaId: string): Promise<Documento[]>;
  findById(id: string): Promise<Documento | null>;
  deleteById(id: string): Promise<void>;  // retorna void, no número de filas afectadas
}
// Token: DOCUMENTO_REPOSITORY_PORT
```

---

## Repositorio: `DocumentoTypeOrmRepository`

### Sin TenantFilter, sin RlsFilter, sin caché

Al igual que `FormatoTypeormRepository`, no aplica filtros automáticos. Cualquier usuario autenticado puede listar documentos de cualquier etapa si conoce el `etapaId`.

| Método | Filtro | Caché |
|---|---|---|
| `guardarVarios()` | Ninguno | No |
| `findByEtapaId()` | Solo por `etapaId` (columna directa) | No |
| `findById()` | Solo por `id` | No |
| `deleteById()` | Solo por `id` | No |

### `guardarVarios()` — inserción en batch

Crea todas las entidades de una vez y las guarda en un solo `orm.save()`:

```ts
const entidades = this.orm.create(documentos as any[]);
const saved = await this.orm.save(entidades);
return saved.map(this.toDomain);
```

TypeORM emite un `INSERT` por cada entidad, pero en la misma conexión sin transacción explícita.

### `findByEtapaId()` — orden por fecha

Usa `repo.find({ where: { etapaId }, order: { creado_en: 'DESC' } })`. Consulta directa por columna, sin JOIN.

### `deleteById()` — sin verificación de filas afectadas

```ts
await this.orm.delete(id);
```

No devuelve `affected`, a diferencia de los repositorios de bitácoras o etapas. El servicio asume que la eliminación siempre tiene efecto si la entidad fue validada previamente con `obtener()`.

---

## Servicio: `DocumentosService`

### `guardarDocumentos(etapaId, archivos)` — guardado múltiple

Construye el array de datos a partir de los ficheros procesados por Multer y llama al repositorio en batch:

```ts
const datos = archivos.map(f => ({
  etapaId,
  nombre_original: f.originalname,
  nombre_archivo:  f.filename,          // nombre UUID generado por Multer
  ruta:            `uploads/documentos/${f.filename}`,
  tipo_mime:       f.mimetype,
  tamanio:         f.size,
}));
return this.repo.guardarVarios(datos);
```

### `obtener(id)`

Busca por ID y lanza `NotFoundException('Documento no encontrado')` si no existe. Usado internamente por `eliminar()` y `descargar`.

### `eliminar(id)` — eliminación física + lógica

```
1. obtener(id) → valida existencia (NotFoundException si no existe)
2. unlinkSync(join(process.cwd(), doc.ruta))
   → Si falla (archivo ya no existe) → silencioso (bloque try/catch vacío)
3. repo.deleteById(id) → elimina el registro de la BD
```

> El bloque `try/catch` en `unlinkSync` está vacío (`catch {}`), por lo que si el archivo no existe en disco, la eliminación del registro procede igualmente sin ningún aviso en el log.

---

## Controlador: `DocumentosController`

**Prefijo**: `/api2/etapas-practicas/:etapaId/documentos`

Este es el único controlador del proyecto con **ruta anidada**. El `etapaId` es parte de la URL, no del body.

| Método | Ruta completa | Roles | Descripción |
|---|---|---|---|
| `POST` | `/etapas-practicas/:etapaId/documentos` | Cualquier autenticado | Subir hasta 20 archivos |
| `GET` | `/etapas-practicas/:etapaId/documentos` | Cualquier autenticado | Listar documentos de la etapa |
| `GET` | `/etapas-practicas/:etapaId/documentos/:documentoId/descargar` | Cualquier autenticado | Descargar archivo con nombre original |
| `DELETE` | `/etapas-practicas/:etapaId/documentos/:documentoId` | Cualquier autenticado | Eliminar documento + archivo físico |

> Ningún endpoint tiene `@Roles()`. El `RlsGuard` global solo exige que el usuario esté autenticado (token válido + `centroId` en headers).

### DTOs de parámetros de ruta

Los parámetros de URL se validan mediante DTOs dedicados con `@Param()`:

```ts
// EtapaParamsDto — para rutas con solo etapaId
class EtapaParamsDto { @IsUUID() etapaId: string; }

// DocumentoParamsDto — para rutas con ambos IDs
class DocumentoParamsDto extends EtapaParamsDto { @IsUUID() documentoId: string; }
```

---

### `POST /api2/etapas-practicas/:etapaId/documentos`

Subida múltiple de archivos. Usa `FilesInterceptor` (plural, a diferencia de `FileInterceptor` en los otros módulos).

**Multipart form-data**:

| Campo | Tipo | Descripción |
|---|---|---|
| `archivos` | archivo(s) | Campo multifile. Máximo **20 archivos**, **10 MB** cada uno |
| `descripcion` | string (opcional) | Etiqueta libre. **No se persiste en la BD** |

**Extensiones permitidas** (validadas por regex sobre el nombre del archivo):
`pdf`, `doc`, `docx`, `xls`, `xlsx`, `png`, `jpg`, `jpeg`, `zip`

**Nombre en disco**: UUID v4 + extensión original (ej: `a1b2c3d4-...-e5f6.pdf`)

**Respuesta exitosa (`201`)**: array de documentos creados.
```json
[
  {
    "id": "uuid-doc-1",
    "etapaId": "uuid-etapa",
    "nombre_original": "contrato_empresa.pdf",
    "nombre_archivo": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "ruta": "uploads/documentos/a1b2c3d4-....pdf",
    "tipo_mime": "application/pdf",
    "tamanio": 204800,
    "creado_en": "2024-03-10T14:30:00.000Z"
  }
]
```

---

### `GET /api2/etapas-practicas/:etapaId/documentos`

Lista todos los documentos de la etapa ordenados por `creado_en DESC`.

---

### `GET /api2/etapas-practicas/:etapaId/documentos/:documentoId/descargar`

Descarga el archivo con su nombre original usando `res.download()`:

```ts
const fullPath = `${process.cwd()}/${doc.ruta}`;
res.download(fullPath, doc.nombre_original);
```

El header `Content-Disposition: attachment; filename="contrato_empresa.pdf"` lo genera Express automáticamente. Si el archivo no existe en disco, Express lanzará un error 404.

> Hay un `console.log('PATH:', fullPath)` temporal en este método que debería eliminarse.

---

### `DELETE /api2/etapas-practicas/:etapaId/documentos/:documentoId`

Elimina el registro y el archivo físico. El `etapaId` en la URL no se valida contra el documento — si se pasa un `documentoId` válido pero perteneciente a otra etapa, la eliminación procederá igualmente.

---

## DTO de respuesta: `ResponseDocumentoDto`

Existe como documentación del contrato de la API pero **no se usa en el código actual** — el servicio retorna directamente objetos `Documento`. Define explícitamente qué campos **no** debe exponer el frontend:

```ts
// ⚠️ nombre_archivo y ruta NO se exponen:
// son rutas internas del servidor — exponerlas sería path disclosure
```

---

## Diferencias clave respecto a `formatos`

| Característica | `documentos-practica` | `formatos` |
|---|---|---|
| Ruta | Anidada (`/etapas-practicas/:etapaId/documentos`) | Simple (`/formatos`) |
| Subida | Múltiple (hasta 20, `FilesInterceptor`) | Individual (`FileInterceptor`) |
| Nombre de archivo | UUID v4 | `timestamp-random` |
| Filtro de tipo | Regex sobre extensión | Lista de MIME types |
| Límite de tamaño | 10 MB por archivo | 10 MB por archivo |
| Descarga | Endpoint dedicado `descargar` con `res.download()` | Servida por `ServeStaticModule` |
| Tipos de archivo | `.pdf`, `.doc/.docx`, `.xls/.xlsx`, `.png/.jpg/.jpeg`, `.zip` | `.pdf`, `.jpg`, `.png`, `.doc/.docx` |
| Tiene `tipo` | No | Sí (`acta_seguimiento`, `bitacora`, `otro`) |

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `MulterModule` | Registro del destino de uploads a nivel de módulo |

### Externas

Ninguna llamada HTTP a servicios externos.

### Módulos que consumen `DocumentosModule`

`DocumentosModule` exporta `DocumentosService` pero actualmente ningún otro módulo lo importa directamente. La entidad `DocumentoOrmEntity` es referenciada como `OneToMany` desde `EtapaPracticaOrmEntity`.

---

## Notas de diseño

- **`descripcion` en DTO no persiste**: El campo `descripcion` de `UploadDocumentoDto` es aceptado por el controller pero `guardarDocumentos()` lo ignora — no hay columna en la entidad. Si en el futuro se quiere etiquetar documentos, hay que agregar la columna a la ORM entity.
- **Filtro por extensión vs. MIME**: La validación usa `extname(file.originalname)` con regex, no el `file.mimetype`. Un usuario puede renombrar un archivo ejecutable a `.pdf` y pasará el filtro. `FormatosController` valida por MIME type, que es más robusto.
- **`catch {}` vacío en `eliminar`**: Si el archivo físico no existe al eliminar, el error se traga silenciosamente sin log. A diferencia de `FormatosService` que emite un `logger.warn()`, aquí no hay ningún aviso.
- **`etapaId` como columna y como FK**: La entidad almacena el UUID directamente en una columna además de la relación TypeORM. Esto permite consultas directas sin JOIN (`WHERE etapaId = :id`) pero requiere mantener los dos valores sincronizados.
- **`onDelete: 'CASCADE'` en BD, pero archivos físicos no se limpian**: Si se elimina una `EtapaPractica` directamente en BD, todos los registros de `documento` se eliminan en cascada. Los archivos físicos en `./uploads/documentos/` quedan huérfanos porque no hay hook que llame a `unlinkSync`.
