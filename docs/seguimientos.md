# Módulo: Seguimientos

## Propósito

Representa las **3 fases de seguimiento** en que se divide cada etapa práctica (bimestre 1, 2 y 3). Normalmente son creados automáticamente por `EtapaPracticaService` al crear una etapa, pero también pueden crearse manualmente vía API. Cada seguimiento agrupa sus **bitácoras** y **observaciones**, y tiene un acta PDF que el instructor puede subir para documentar la visita.

Este módulo es exportado y consumido directamente por `EtapaPracticaModule` para crear los seguimientos en cascada y para calcular el avance de la etapa.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `seguimientos.module.ts` | Declara el módulo, vincula los dos puertos, importa `HttpModule` y **exporta** `SeguimientosService` |
| `infrastructure/http/seguimientos.controller.ts` | 9 endpoints REST incluyendo subida de acta PDF con Multer |
| `application/seguimientos.service.ts` | CRUD, cambio de estado, subida de acta y consulta por alumno vía ERP |
| `domain/entities/seguimiento.entity.ts` | Entidad de dominio pura |
| `domain/ports/seguimiento.repository.port.ts` | Interfaz `ISeguimientoRepository` con 8 métodos + token |
| `domain/ports/matricula.service.port.ts` | Interfaz `IMatriculaServicePort` + token |
| `infrastructure/entities/seguimiento.orm-entity.ts` | Entidad TypeORM con relaciones a EtapaPractica, Asignacion, Bitácoras y Observaciones |
| `infrastructure/adapters/seguimiento.typeorm.repository.ts` | Implementa el repositorio con `TenantFilter`, `RlsFilter` y caché |
| `infrastructure/adapters/matricula.http.adapter.ts` | Implementa `IMatriculaServicePort` llamando al ERP |
| `infrastructure/http/dto/create-seguimiento.dto.ts` | Validación de creación |
| `infrastructure/http/dto/update-seguimiento.dto.ts` | Extiende con todos los campos opcionales |

---

## Entidades

### Dominio: `Seguimiento`

```ts
class Seguimiento {
  id: string;
  actas_pdf: string;     // nombre del archivo PDF o 'pendiente'
  estado: string;        // 'activo' | 'inactivo' | 'pendiente'
  observacion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  etapa?: { id: string };
  asignacion?: { id: string };
  bitacoras?: { id: string; fecha: Date; estado: string }[];
}
```

### ORM: `SeguimientoOrmEntity`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `centroId` | `uuid` | Centro de formación (multi-tenancy) |
| `sedeId` | `uuid` (nullable) | Sede dentro del centro |
| `actas_pdf` | `text` (nullable) | Nombre del archivo de acta subido |
| `estado` | `text` | Estado del seguimiento |
| `observacion` | `text` | Notas del seguimiento |
| `fecha_inicio` | `date` | Inicio del bimestre |
| `fecha_fin` | `date` | Fin del bimestre |
| `etapa` | `ManyToOne → EtapaPracticaOrmEntity` | Etapa práctica a la que pertenece |
| `asignacion` | `ManyToOne → AsignacionOrmEntity` | Asignación vinculada (nullable) |
| `bitacoras` | `OneToMany → BitacoraOrmEntity` | Bitácoras del seguimiento |
| `observaciones` | `OneToMany → ObservacionOrmEntity` | Observaciones del seguimiento |

---

## Puertos del dominio

### `ISeguimientoRepository`

```ts
interface ISeguimientoRepository {
  create(data: Partial<Seguimiento> & { etapa: { id: string }; asignacion?: { id: string } }): Promise<Seguimiento>;
  findAll(): Promise<Seguimiento[]>;
  findById(id: string): Promise<Seguimiento | null>;
  save(seguimiento: Seguimiento): Promise<Seguimiento>;
  updateEstado(id: string, estado: string): Promise<void>;
  updateActas(id: string, filename: string): Promise<void>;
  remove(seguimiento: Seguimiento): Promise<void>;
  findByMatriculaIds(ids: string[]): Promise<Seguimiento[]>;
  findByEtapaId(etapaId: string): Promise<Seguimiento[]>;
}
// Token: SEGUIMIENTO_REPOSITORY_PORT
```

### `IMatriculaServicePort`

```ts
interface IMatriculaServicePort {
  listarPorAlumno(idAlumno: string, token: string): Promise<any[]>;
}
// Token: MATRICULA_SERVICE_PORT
```

---

## Adaptador externo: `MatriculaHttpAdapter`

Implementa `IMatriculaServicePort`. Obtiene las matrículas de un alumno desde el ERP.

**URL base**: `http://localhost:3000/api/matriculas/persona` (hardcodeada, igual que `PersonaHttpAdapter`).

**Token**: Recibido como parámetro (mismo patrón que `PersonaHttpAdapter`, distinto a `MunicipioHttpAdapter`).

**Comportamiento**:
- `GET /persona/{idAlumno}` con `Authorization: Bearer <token>`
- `404` → retorna `[]` (sin matrículas, no es error)
- Otro error → lanza `InternalServerErrorException`

---

## Repositorio: `SeguimientoTypeOrmRepository`

### Filtros en lecturas

Todas las consultas aplican `TenantFilter` + `RlsFilter.applySeguimiento()`:

| Rol | Filtro RLS |
|---|---|
| `admin` | Sin filtro adicional |
| `estudiante` | `INNER JOIN etapa WHERE etapa.matriculaId IN (:...matriculaIds)` |
| `docente` | `INNER JOIN etapa INNER JOIN asignaciones WHERE instructor = :personaId AND estado = 'activo'` |

### `save()` — actualización parcial segura

A diferencia de otros repositorios que hacen `orm.save(entity)`, este método construye un objeto `fields` solo con los campos definidos (no `undefined`) y ejecuta un `UPDATE ... SET` selectivo. Esto evita sobrescribir columnas con `NULL` cuando el DTO de actualización es parcial.

```ts
// Solo actualiza los campos presentes en el objeto
if (seguimiento.actas_pdf   !== undefined) fields.actas_pdf   = seguimiento.actas_pdf;
if (seguimiento.estado      !== undefined) fields.estado      = seguimiento.estado;
// ... etc
```

### `findByEtapaId()` — sin caché

Esta consulta está **intencionalmente sin caché** (a diferencia del resto). El comentario en el código indica que se llama al abrir el modal del seguimiento y necesita datos siempre frescos. Una invalidación incompleta causó bugs anteriores.

### `findByMatriculaIds()` — con bitácoras

Esta consulta hace `leftJoinAndSelect` sobre `bitacoras`, devolviendo los seguimientos con sus bitácoras incluidas. Se usa para el endpoint de consulta por alumno.

### Claves de caché

| Operación | Clave |
|---|---|
| `findAll()` | `seguimientos` |
| `findById(id)` | `seguimientos:{id}` |
| `findByMatriculaIds(ids)` | `seguimientos:matriculas:{ids.join(',')}` |
| `findByEtapaId()` | **Sin caché** |

---

## Servicio: `SeguimientosService`

### `create(dto)`

Crea un seguimiento manualmente vía API. Separa `etapaId` y `asignacionId` del DTO y los convierte a referencias `{ id }`.

### `update(id, dto)`

Carga el seguimiento con `findOne`, hace merge y guarda. El repositorio solo actualiza los campos definidos.

### `remove(id)`

Carga la entidad y la elimina con `repository.remove()` (no `deleteById`).

### `cambiarEstado(id, estado)`

Valida existencia con `findOne` y llama a `updateEstado()` directamente (sin recargar el objeto completo).

### `subirActa(id, filename)`

Valida existencia y llama a `updateActas()` con el nombre del archivo guardado por Multer.

### `findByEtapaId(etapaId)`

Delega directamente en el repositorio. Usado por `EtapaPracticaService.actualizarAvance()`.

### `listarSeguimientoPorAlumno(idAlumno, token)` — consulta en dos pasos

```
1. Llama a MatriculaHttpAdapter.listarPorAlumno(idAlumno, token)
   → Obtiene lista de matrículas del alumno desde el ERP

2. Extrae los IDs: matriculas.map(m => m.matriculaId)

3. Llama a repository.findByMatriculaIds(idsMatricula)
   → Retorna seguimientos cuya etapa.matriculaId esté en la lista

Si el alumno no tiene matrículas → retorna []
```

### `createInternal(data)` — método sin autenticación de aplicación

Creado para ser llamado por `EtapaPracticaService` al generar seguimientos en cascada. Acepta los datos directamente sin pasar por el DTO de validación HTTP. No requiere token porque quien lo llama ya está autenticado.

```ts
async createInternal(data: {
  actas_pdf: string;
  estado: string;
  observacion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  etapaId: string;
  asignacionId?: string;
})
```

---

## Controlador: `SeguimientosController`

**Prefijo**: `/api2/seguimientos`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crear seguimiento manualmente |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Listar (filtrado por RLS) |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener uno |
| `PATCH` | `/:id` | `admin`, `docente` | Actualizar campos |
| `PATCH` | `/:id/estado` | `admin`, `docente` | Cambiar estado |
| `PATCH` | `/:id/acta` | `admin`, `docente` | Subir acta PDF (multipart) |
| `DELETE` | `/:id` | `admin` | Eliminar |
| `GET` | `/etapa/:id` | `admin`, `docente`, `estudiante` | Listar por etapa práctica |
| `GET` | `/alumno/:id` | `admin`, `docente`, `estudiante` | Listar por alumno (vía ERP) |

---

### `POST /api2/seguimientos`

**Body**:
```json
{
  "fecha_inicio": "2024-01-15",
  "fecha_fin": "2024-03-15",
  "etapaId": "uuid-etapa",
  "asignacionId": "uuid-asignacion",
  "estado": "activo",
  "observacion": "Primer seguimiento",
  "actas_pdf": "pendiente"
}
```

- `estado` valores válidos: `"activo"`, `"inactivo"`, `"pendiente"`.
- `actas_pdf`, `estado` y `observacion` son opcionales.

---

### `PATCH /api2/seguimientos/:id/acta`

Sube un archivo PDF como acta del seguimiento.

**Multipart form-data**:
- Campo `file`: archivo PDF (solo `application/pdf`, sin límite de tamaño explícito)

**Almacenamiento**: `./uploads/actas/{timestamp}-{random}.pdf`

**Respuesta exitosa (`200`)**:
```json
{ "id": "uuid-seguimiento", "actas_pdf": "1700000000000-123456789.pdf" }
```

**Error si no es PDF (`400`)**:
```json
{ "message": "Solo se permiten archivos PDF" }
```

---

### `GET /api2/seguimientos/alumno/:id`

Requiere token de autenticación (`Authorization` header o cookie `token`). El controlador valida el token antes de llamar al servicio, lanzando `UnauthorizedException` si falta.

**Flujo**:
1. ERP → lista de matrículas del alumno
2. BD local → seguimientos cuya etapa tenga esas matrículas

**Respuesta**: array de seguimientos con bitácoras incluidas.

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `AppCacheService` | Caché con invalidación en mutaciones |
| `TenantFilter` | Aislamiento por `centroId` |
| `RlsFilter.applySeguimiento()` | Filtro por rol en todas las lecturas |

### Externas

| Servicio | Endpoint | Cuándo |
|---|---|---|
| ERP externo | `GET http://localhost:3000/api/matriculas/persona/:id` | Al consultar seguimientos por alumno |

### Módulos que consumen `SeguimientosModule`

| Módulo | Uso |
|---|---|
| `EtapaPracticaModule` | Llama a `createInternal()` para generar los 3 seguimientos y a `findByEtapaId()` para calcular el avance |
| `ObservacionesModule` | Importa `SeguimientosModule` para llamar a `findByEtapaId()` al crear una observación vinculada a la última fase de una etapa |

---

## Notas de diseño

- **`findByEtapaId` sin caché**: Decisión consciente documentada en el código. Este método es llamado frecuentemente al navegar el modal de la etapa y los datos deben estar actualizados. El TTL corto de 30 s del caché general no es suficiente garantía aquí.
- **`save()` con `UPDATE` selectivo**: Protege contra la sobreescritura con `NULL` que ocurre cuando se usa `orm.save()` con un objeto parcial en TypeORM. Es el único repositorio del proyecto que implementa este patrón explícitamente.
- **`createInternal` vs DTO HTTP**: El método interno acepta `Date` ya construidas (no `DateString`), mientras que el DTO del controller las recibe como strings ISO 8601. Esto es correcto porque `EtapaPracticaService` calcula las fechas con aritmética de `Date` antes de llamar a `createInternal`.
- **URL hardcodeada**: `MatriculaHttpAdapter` usa `http://localhost:3000/api/matriculas/persona` sin variable de entorno. Si el ERP cambia de host, hay que modificar el archivo directamente.
