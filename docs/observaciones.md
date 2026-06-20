# Módulo: Observaciones

## Propósito

Registra las observaciones y evidencias fotográficas que el instructor deja durante las visitas de seguimiento. Una observación pertenece a un **seguimiento** concreto, pero el módulo ofrece un endpoint especial (`POST /etapa/:etapaId`) que la crea automáticamente en el **último seguimiento** de la etapa, evitando que el cliente tenga que conocer el ID del seguimiento activo.

La subida de la imagen de evidencia es un proceso de **dos pasos**: primero se sube la imagen vía `POST /upload/evidencia` y se recibe la URL pública; luego esa URL se incluye en el body al crear la observación.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `observaciones.module.ts` | Declara el módulo, importa `SeguimientosModule` para acceder a `SeguimientosService` |
| `infrastructure/http/observaciones.controller.ts` | 9 endpoints REST incluyendo pre-upload de imagen y creación por etapa |
| `application/observaciones.service.ts` | CRUD y lógica de `createParaEtapa` |
| `domain/entities/observacion.entity.ts` | Entidad de dominio pura |
| `domain/ports/observacion.repository.port.ts` | Interfaz `IObservacionRepository` con 7 métodos + token |
| `infrastructure/entities/observacion.orm-entity.ts` | Entidad TypeORM con relación a `SeguimientoOrmEntity` |
| `infrastructure/adapters/observacion.typeorm.repository.ts` | Implementa el repositorio con `TenantFilter`, `RlsFilter` y caché |
| `infrastructure/http/dto/create-observacione.dto.ts` | Validación de creación |
| `infrastructure/http/dto/update-observacione.dto.ts` | Extiende con todos los campos opcionales |

---

## Entidades

### Dominio: `Observacion`

```ts
class Observacion {
  id: string;
  fecha: Date;
  descripcion: string;
  evidencia_foto: string;   // URL pública o string vacío ''
  persona: string;          // UUID del personaId que registra la observación
  seguimiento?: { id: string };
}
```

### ORM: `ObservacionOrmEntity`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `centroId` | `uuid` | Centro de formación (multi-tenancy) |
| `sedeId` | `uuid` (nullable) | Sede opcional |
| `fecha` | `date` | Fecha de la observación |
| `descripcion` | `text` | Contenido de la observación |
| `evidencia_foto` | `text` | URL pública de la imagen (`/uploads/observaciones/...`) o `''` |
| `persona` | `text` | UUID del personaId del autor |
| `seguimiento` | `ManyToOne → SeguimientoOrmEntity` | Seguimiento al que pertenece |

---

## Puerto: `IObservacionRepository`

```ts
interface IObservacionRepository {
  create(data: any): Promise<Observacion>;
  findAll(): Promise<Observacion[]>;
  findById(id: string): Promise<Observacion | null>;
  findByEtapaId(etapaId: string): Promise<Observacion[]>;
  findBySeguimientoId(seguimientoId: string): Promise<Observacion[]>;
  save(o: Observacion): Promise<Observacion>;
  deleteById(id: string): Promise<number>;
}
// Token: OBSERVACION_REPOSITORY_PORT
```

---

## Repositorio: `ObservacionTypeOrmRepository`

### Comportamiento de caché y filtros por método

| Método | Caché | TenantFilter | RlsFilter |
|---|---|---|---|
| `findAll()` | Sí — clave `observaciones` | ✓ | `applyObservacion()` |
| `findById(id)` | Sí — clave `observaciones:{id}` | ✓ | `applyObservacion()` |
| `findByEtapaId(etapaId)` | **No** | ✓ | **No aplicado** |
| `findBySeguimientoId(id)` | **No** | ✓ | `applyObservacion()` |

> **Nota de seguridad**: `findByEtapaId()` solo aplica `TenantFilter` pero **no** `RlsFilter`. Esto significa que cualquier usuario autenticado del centro puede ver las observaciones de cualquier etapa, independientemente de si es el instructor asignado o el aprendiz de esa matrícula. Los demás métodos sí aplican el filtro de rol.

### `RlsFilter.applyObservacion()`

Filtro por rol sobre las observaciones:

| Rol | Filtro |
|---|---|
| `admin` | Sin filtro — ve todas |
| `estudiante` | `INNER JOIN seguimiento → etapa WHERE etapa.matriculaId IN (:...matriculaIds)` |
| `docente` | `INNER JOIN seguimiento → etapa → asignaciones WHERE instructor = :personaId AND estado = 'activo'` |

### `findByEtapaId()` y `findBySeguimientoId()` — sin caché

Ambos métodos leen directamente de la BD. Retornan resultados ordenados por `fecha DESC`.

### `save()` — usa `orm.save(orm.create(o))`

A diferencia de bitácoras y seguimientos que usan `QueryBuilder UPDATE`, aquí se usa `orm.save()`. Como la entidad de dominio no contiene `centroId`, la llamada a `orm.create(o)` genera una entidad sin ese campo, lo que podría sobrescribirlo con `NULL` en ciertos escenarios de TypeORM. Punto a revisar si aparecen problemas de tenancy en actualizaciones.

---

## Servicio: `ObservacionesService`

### `create(dto)`

Crea una observación directamente en el seguimiento indicado por `seguimientoId` del DTO.

### `createParaEtapa(etapaId, data)` — lógica especial

Este método elimina la necesidad de que el cliente conozca el ID del seguimiento activo:

```
1. Llama a SeguimientosService.findByEtapaId(etapaId)
   → Obtiene todos los seguimientos de la etapa

2. Si el array está vacío → BadRequestException:
   "La etapa práctica no tiene ningún seguimiento registrado.
    Crea un seguimiento antes de registrar observaciones."

3. Toma el último elemento del array (seguimientos[seguimientos.length - 1])
   → Asume que es el seguimiento más reciente

4. Crea la observación vinculada a ese seguimientoId
   → evidencia_foto se inicializa como '' (string vacío)
```

> **Supuesto implícito**: El orden del array devuelto por `findByEtapaId` determina cuál es el "último" seguimiento. Si los seguimientos se devuelven en orden de creación, el último corresponde al bimestre más avanzado, que es el comportamiento esperado.

### `findByEtapa(etapaId)`

Delega en `repository.findByEtapaId()`. Retorna todas las observaciones de todos los seguimientos de la etapa, ordenadas por fecha descendente.

### `findBySeguimiento(seguimientoId)`

Delega en `repository.findBySeguimientoId()`. Retorna observaciones de un seguimiento concreto.

### `remove(id)`

Usa `deleteById()`. Retorna `{ message: 'Observacion con id ... eliminada correctamente' }`.

---

## Controlador: `ObservacionesController`

**Prefijo**: `/api2/observaciones`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/upload/evidencia` | `admin`, `docente` | Pre-upload de imagen de evidencia |
| `POST` | `/` | `admin`, `docente` | Crear observación (con `seguimientoId` explícito) |
| `POST` | `/etapa/:etapaId` | `admin`, `docente` | Crear en el último seguimiento de la etapa |
| `GET` | `/etapa/:etapaId` | `admin`, `docente`, `estudiante` | Listar todas las de una etapa |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Listar todas (filtrado por RLS) |
| `GET` | `/seguimiento/:seguimientoId` | `admin`, `docente`, `estudiante` | Listar por seguimiento |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener una |
| `PATCH` | `/:id` | `admin`, `docente` | Actualizar |
| `DELETE` | `/:id` | `admin` | Eliminar |

---

### `POST /api2/observaciones/upload/evidencia` — Paso 1 del flujo de imagen

Sube la imagen de evidencia y devuelve su URL pública.

**Multipart form-data**:
- Campo `file`: imagen (formatos permitidos: `.jpg`, `.jpeg`, `.png`, `.webp`)
- Tamaño máximo: **5 MB**

**Almacenamiento**: `./uploads/observaciones/{timestamp}-{random}.{ext}`

**Respuesta exitosa (`201`)**:
```json
{ "url": "/uploads/observaciones/1700000000000-123456.jpg" }
```

**Error si formato no permitido (`400`)**:
```json
{ "message": "Archivo inválido o no enviado" }
```

> La URL retornada la sirve `ServeStaticModule` como archivo estático bajo `/uploads/...`. El cliente la almacena y la incluye como `evidencia_foto` en el siguiente paso.

---

### `POST /api2/observaciones` — Paso 2: crear con seguimientoId explícito

**Body**:
```json
{
  "seguimientoId": "uuid-seguimiento",
  "fecha": "2024-03-10",
  "descripcion": "El aprendiz muestra avance en el proyecto asignado.",
  "persona": "uuid-persona-instructor",
  "evidencia_foto": "/uploads/observaciones/1700000000000-123456.jpg"
}
```

`evidencia_foto` es opcional en el DTO (`@IsOptional()`).

---

### `POST /api2/observaciones/etapa/:etapaId` — Creación simplificada

No requiere conocer el `seguimientoId`. El servidor determina el seguimiento destino.

**Body**:
```json
{
  "descripcion": "Visita de seguimiento mensual.",
  "persona": "uuid-persona-instructor",
  "fecha": "2024-03-10"
}
```

**Error si la etapa no tiene seguimientos (`400`)**:
```json
{
  "message": "La etapa práctica no tiene ningún seguimiento registrado. Crea un seguimiento antes de registrar observaciones."
}
```

---

## Flujo completo de una observación con evidencia

```
1. POST /api2/observaciones/upload/evidencia
   (multipart: campo 'file' con imagen JPG/PNG/WebP, máx 5MB)
   ← { "url": "/uploads/observaciones/xyz.jpg" }

2. POST /api2/observaciones/etapa/:etapaId
   body: { descripcion, persona, fecha, evidencia_foto: "/uploads/observaciones/xyz.jpg" }
   ← { id, fecha, descripcion, evidencia_foto, persona, seguimiento: { id } }
```

---

## Dependencias

### Módulos importados

| Módulo | Por qué |
|---|---|
| `SeguimientosModule` | Inyecta `SeguimientosService` para llamar a `findByEtapaId()` en `createParaEtapa()` |

### Internas (servicios comunes)

| Dependencia | Uso |
|---|---|
| `AppCacheService` | Caché en `findAll` y `findById` |
| `TenantFilter` | Aislamiento por `centroId` en todas las consultas |
| `RlsFilter.applyObservacion()` | Filtro por rol (excepto en `findByEtapaId`) |

### Externas

Ninguna llamada HTTP a servicios externos.

---

## Notas de diseño

- **Subida de imagen desacoplada de la creación**: El pre-upload (`POST /upload/evidencia`) devuelve solo una URL, no crea ningún registro. Si el usuario sube la imagen pero no crea la observación, el archivo queda huérfano en disco. No hay limpieza automática de archivos huérfanos.
- **`createParaEtapa` asume orden de array**: Toma `seguimientos[seguimientos.length - 1]` como el más reciente. Si `findByEtapaId()` cambia su ordenación, este comportamiento cambia silenciosamente. Sería más robusto ordenar explícitamente por `fecha_inicio DESC` dentro del método.
- **`findByEtapaId` sin RLS**: Esta consulta no aplica `RlsFilter`, a diferencia de todos los otros métodos de lectura del repositorio. Cualquier usuario autenticado del centro puede ver observaciones de cualquier etapa usando este endpoint.
- **`evidencia_foto` no nullable en ORM pero opcional en DTO**: La columna es `text` sin `nullable`. `createParaEtapa` pasa `''` cuando no hay foto. El DTO de creación directa acepta `evidencia_foto` como `@IsOptional()`, lo que podría causar que llegue `undefined` y falle la restricción `NOT NULL` en BD si no se maneja.
