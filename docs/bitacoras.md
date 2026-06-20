# Módulo: Bitacoras

## Propósito

Registra las **bitácoras diarias** del aprendiz dentro de cada seguimiento. Cada seguimiento tiene 2 bitácoras creadas automáticamente al crear la etapa práctica. El aprendiz sube el PDF de su bitácora y el instructor la revisa cambiando su estado a `'aceptada'` o `'rechazada'`. El campo `estado = 'aceptada'` es el que `EtapaPracticaService` cuenta para calcular el porcentaje de avance de la etapa.

Este módulo no hace llamadas a servicios externos. Es exportado para que `EtapaPracticaModule` pueda crear bitácoras en cascada y consultarlas al calcular el avance.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `bitacoras.module.ts` | Declara el módulo, vincula el puerto al repositorio TypeORM y **exporta** `BitacorasService` |
| `infrastructure/http/bitacoras.controller.ts` | 8 endpoints REST, incluyendo subida de PDF y cambio de estado |
| `application/bitacoras.service.ts` | CRUD, validación de estado y subida de PDF |
| `domain/entities/bitacora.entity.ts` | Entidad de dominio pura |
| `domain/ports/bitacora.repository.port.ts` | Interfaz `IBitacoraRepository` con 7 métodos + token |
| `infrastructure/entities/bitacora.orm-entity.ts` | Entidad TypeORM con relación a `SeguimientoOrmEntity` |
| `infrastructure/adapters/bitacora.typeorm.repository.ts` | Implementa el repositorio con `TenantFilter`, `RlsFilter` y caché |
| `infrastructure/http/dto/create-bitacora.dto.ts` | Validación de creación |
| `infrastructure/http/dto/update-bitacora.dto.ts` | Extiende con todos los campos opcionales |

---

## Entidades

### Dominio: `Bitacora`

```ts
class Bitacora {
  id: string;
  fecha: Date;
  bitacora_pdf: string;    // nombre del archivo PDF o 'pendiente'
  estado: string;          // 'pendiente' | 'aceptada' | 'rechazada'
  seguimiento?: { id: string };
}
```

### ORM: `BitacoraOrmEntity`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `centroId` | `uuid` | Centro de formación (multi-tenancy) |
| `sedeId` | `uuid` (nullable) | Sede opcional |
| `fecha` | `date` | Fecha de la bitácora |
| `bitacora_pdf` | `text` | Nombre del archivo PDF almacenado, o `'pendiente'` hasta que se suba |
| `estado` | `text` | default `'pendiente'` |
| `seguimiento` | `ManyToOne → SeguimientoOrmEntity` | Seguimiento al que pertenece |

---

## Puerto: `IBitacoraRepository`

```ts
interface IBitacoraRepository {
  create(data: Partial<Bitacora> & { seguimiento: { id: string } }): Promise<Bitacora>;
  findAll(): Promise<Bitacora[]>;
  findById(id: string): Promise<Bitacora | null>;
  save(bitacora: Bitacora): Promise<Bitacora>;
  deleteById(id: string): Promise<number>;
  findBySeguimientoId(seguimientoId: string): Promise<Bitacora[]>;
  updatePdf(id: string, filename: string): Promise<void>;
}
// Token: BITACORA_REPOSITORY_PORT
```

---

## Repositorio: `BitacoraTypeOrmRepository`

### Filtros en lecturas

`findAll()`, `findById()` y `findBySeguimientoId()` aplican siempre:

1. `TenantFilter.apply(qb, 'b')` — filtra por `centroId`
2. `RlsFilter.applyBitacora(qb, 'b')` — filtro por rol:

| Rol | Filtro RLS |
|---|---|
| `admin` | Sin filtro — ve todas las bitácoras del centro |
| `estudiante` | `INNER JOIN seguimiento → etapa WHERE etapa.matriculaId IN (:...matriculaIds)` |
| `docente` | `INNER JOIN seguimiento → etapa → asignaciones WHERE instructor = :personaId AND estado = 'activo'` |

El RLS de bitácora es el más profundo del sistema: atraviesa **3 niveles** de JOIN (bitácora → seguimiento → etapa → asignaciones) para llegar al instructor.

### `save()` — UPDATE selectivo por QueryBuilder

Al igual que `SeguimientoTypeOrmRepository`, usa `QueryBuilder.update()` con campos explícitos para no sobrescribir `centroId` ni la FK de `seguimiento`:

```ts
await this.orm.createQueryBuilder().update()
  .set({ fecha, bitacora_pdf, estado })
  .where('id = :id', { id: bitacora.id })
  .execute();
```

### `findBySeguimientoId()` — sin caché

Misma decisión que `SeguimientoTypeOrmRepository.findByEtapaId()`: el modal del seguimiento necesita datos frescos. El caché con sufijo tenía invalidación incompleta.

### `updatePdf()` — UPDATE de campo único

Actualiza solo `bitacora_pdf` sin tocar el resto de la fila.

### Claves de caché

| Operación | Clave |
|---|---|
| `findAll()` | `bitacoras` |
| `findById(id)` | `bitacoras:{id}` |
| `findBySeguimientoId()` | **Sin caché** |

Mutaciones (`create`, `save`, `deleteById`, `updatePdf`) invalidan `bitacoras`.

---

## Servicio: `BitacorasService`

### `create(dto)`

Separa `seguimientoId` del DTO y crea con referencia `seguimiento: { id: seguimientoId }`.

### `cambiarEstado(id, estado)`

Valida que el estado sea uno de `['pendiente', 'aceptada', 'rechazada']`. Lanza `BadRequestException('Estado inválido')` si no es válido. Carga la bitácora existente y hace `save()` con el nuevo estado.

> **Impacto directo en avance**: cambiar a `'aceptada'` incrementa el contador que `EtapaPracticaService.actualizarAvance()` usa para calcular el porcentaje de la etapa.

### `actualizarPdf(id, filename)`

Llama directamente a `updatePdf()` del repositorio sin recargar la entidad. Retorna `{ bitacora_pdf: filename }`.

### `findBySeguimientoId(seguimientoId)`

Delegación directa al repositorio. Usado por `EtapaPracticaService.actualizarAvance()` para contar las bitácoras aceptadas de cada seguimiento.

### `createInternal(data)` — método sin autenticación de aplicación

Para uso exclusivo de `EtapaPracticaService` al crear bitácoras en cascada. Acepta `Date` construidas (no `DateString`).

```ts
async createInternal(data: {
  fecha: Date;
  bitacora_pdf: string;  // valor inicial: 'pendiente'
  estado: string;        // valor inicial: 'pendiente'
  seguimientoId: string;
})
```

---

## Controlador: `BitacorasController`

**Prefijo**: `/api2/bitacoras`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin`, `docente` | Crear bitácora manualmente |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Listar todas (filtrado por RLS) |
| `GET` | `/seguimiento/:id` | `admin`, `docente`, `estudiante` | Listar por seguimiento |
| `POST` | `/:id/pdf` | `admin`, `docente`, `estudiante` | Subir PDF de la bitácora |
| `PATCH` | `/:id/estado` | `admin`, `docente` | Cambiar estado |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener una bitácora |
| `PATCH` | `/:id` | `admin`, `docente` | Actualizar campos |
| `DELETE` | `/:id` | `admin` | Eliminar |

> **Orden de rutas**: el controlador define `/seguimiento/:id` y `/:id/pdf` **antes** de `/:id` para evitar que NestJS interprete el segmento `seguimiento` o `pdf` como un UUID. Hay un comentario en el código que lo indica explícitamente.

---

### `POST /api2/bitacoras`

**Body**:
```json
{
  "fecha": "2024-02-10",
  "bitacora_pdf": "pendiente",
  "estado": "pendiente",
  "seguimientoId": "uuid-seguimiento"
}
```

`estado` válidos: `"pendiente"`, `"aceptada"`, `"rechazada"`.

**Respuesta exitosa (`201`)**:
```json
{
  "id": "uuid-generado",
  "fecha": "2024-02-10",
  "bitacora_pdf": "pendiente",
  "estado": "pendiente",
  "seguimiento": { "id": "uuid-seguimiento" }
}
```

---

### `POST /api2/bitacoras/:id/pdf`

Sube el PDF de la bitácora. Usa **`POST`** (no `PATCH` como en Seguimientos).

**Multipart form-data**:
- Campo `file`: archivo PDF (solo `application/pdf`)

**Almacenamiento**: `./uploads/bitacoras/{timestamp}-{random}.pdf`

**Respuesta exitosa (`201`)**:
```json
{ "bitacora_pdf": "1700000000000-123456789.pdf" }
```

---

### `PATCH /api2/bitacoras/:id/estado`

```json
{ "estado": "aceptada" }
```

Solo `admin` y `docente` pueden cambiar el estado. El aprendiz puede ver sus bitácoras pero no aprobarlas ni rechazarlas.

---

## Ciclo de vida de una bitácora

```
[Auto-creada por EtapaPractica]
       ↓
  estado: 'pendiente'
  bitacora_pdf: 'pendiente'
       ↓
[Aprendiz sube el PDF]
  POST /:id/pdf
  bitacora_pdf: '1700000000000-xyz.pdf'
       ↓
[Instructor revisa]
  PATCH /:id/estado
       ├── estado: 'aceptada'  → cuenta para el avance de la etapa
       └── estado: 'rechazada' → no cuenta; aprendiz puede subir nuevo PDF
```

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `AppCacheService` | Caché de lecturas con invalidación en mutaciones |
| `TenantFilter` | Aislamiento por `centroId` |
| `RlsFilter.applyBitacora()` | Filtro de 3 niveles de JOIN por rol |

### Externas

Ninguna. Este módulo no llama a servicios HTTP externos.

### Módulos que consumen `BitacorasModule`

| Módulo | Uso |
|---|---|
| `EtapaPracticaModule` | Llama a `createInternal()` para generar las 6 bitácoras iniciales y a `findBySeguimientoId()` para calcular el avance |

---

## Notas de diseño

- **`bitacora_pdf` no es nullable**: La columna es `text` sin `nullable: true`. Al crear (automáticamente o manualmente) se inicializa con el string literal `'pendiente'`. Solo cuando el aprendiz sube el archivo real se reemplaza ese valor por el nombre del fichero. Esta convención evita `NULL` en la columna pero requiere que quien consulte distinga entre `'pendiente'` y un nombre de fichero real.
- **El estudiante puede subir PDF**: `POST /:id/pdf` permite el rol `'estudiante'`, lo que refleja el flujo real — es el aprendiz quien sube su bitácora diaria.
- **`cambiarEstado` recarga la entidad**: A diferencia de `SeguimientoService.cambiarEstado()` que llama directamente a `updateEstado()`, aquí se hace `findOne()` + `save()`. La consecuencia es un `SELECT` adicional antes del `UPDATE` y que el `save()` actualiza también `fecha` y `bitacora_pdf` aunque no hayan cambiado.
- **Sin transacción entre PDF y estado**: El aprendiz puede subir el PDF y después el instructor cambia el estado en requests separados. Si el proceso se interrumpe entre ambos, la bitácora puede tener PDF pero estado `'pendiente'`, lo cual es el comportamiento esperado.
