# Módulo: EtapaPractica

## Propósito

Es la **entidad central** del sistema. Representa el periodo de práctica profesional de un aprendiz en una empresa. Al crear una etapa, el sistema genera automáticamente toda la estructura de seguimiento: **3 seguimientos** (uno por cada bimestre) y **6 bitácoras** (2 por seguimiento). Opcionalmente crea también la asignación del instructor en el mismo request.

Concentra las dependencias de mayor peso del sistema: importa los servicios de `Seguimientos`, `Bitácoras`, `Asignaciones` y `Configuracion`.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `etapa_practica.module.ts` | Declara el módulo; importa `SeguimientosModule`, `BitacorasModule`, `AsignacionesModule` y `ConfiguracionModule` |
| `infrastructure/http/etapa_practica.controller.ts` | 11 endpoints REST con control de roles |
| `application/etapa_practica.service.ts` | Orquesta la creación en cascada, cálculo de avance y cambios de estado |
| `domain/entities/etapa_practica.entity.ts` | Entidad de dominio con campos desnormalizados de empresa, modalidad, seguimientos y bitácoras |
| `domain/ports/etapa_practica.repository.port.ts` | Interfaz `IEtapaPracticaRepository` con 9 métodos |
| `infrastructure/entities/etapa_practica.orm-entity.ts` | Entidad TypeORM con relaciones a Empresa, Modalidad, Asignaciones, Seguimientos y Documentos |
| `infrastructure/adapters/etapa_practica.typeorm.repository.ts` | Implementa el puerto con `TenantFilter`, `RlsFilter` y `AppCacheService` |
| `infrastructure/http/dto/create-etapa_practica.dto.ts` | DTO principal + `CreateAsignacionEnEtapaDto` anidado |
| `infrastructure/http/dto/update-etapa_practica.dto.ts` | Extiende `CreateEtapaPracticaDto` con todos los campos opcionales |

---

## Entidades

### Dominio: `EtapaPractica`

```ts
class EtapaPractica {
  id: string;
  matriculaId: string;       // UUID de la matrícula del aprendiz en el ERP
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  observacion: string;
  avance: number;            // 0-100, calculado desde bitácoras aceptadas
  empresa?: {
    id, nombre, nit, direccion, telefono, correo, municipio, tipo
  };
  modalidad?: { id, nombre };
  seguimientos?: [{ id, fecha_inicio, fecha_fin, observacion, actas_pdf, estado }];
  bitacoras?: [{ id, fecha, estado }];  // aplanadas desde todos los seguimientos
}
```

### ORM: `EtapaPracticaOrmEntity` — tabla `etapa_practica_orm_entity` (auto-generada por TypeORM)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `centroId` | `uuid` | Centro de formación (multi-tenancy) |
| `sedeId` | `uuid` (nullable) | Sede dentro del centro |
| `matriculaId` | `uuid` | ID de la matrícula del aprendiz en el ERP externo |
| `fecha_inicio` | `date` | Inicio de la práctica |
| `fecha_fin` | `date` | Fin de la práctica |
| `estado` | `text` | Estado actual (ver valores válidos abajo) |
| `observacion` | `text` | Notas libres |
| `avance` | `int` | default `0`. Porcentaje calculado. |
| `empresa` | `ManyToOne → EmpresaOrmEntity` | Empresa donde realiza la práctica |
| `modalidad` | `ManyToOne → ModalidadOrmEntity` | Tipo de modalidad |
| `asignaciones` | `OneToMany → AsignacionOrmEntity` | Instructores asignados |
| `seguimientos` | `OneToMany → SeguimientoOrmEntity` | 3 fases de seguimiento |
| `documentos` | `OneToMany → DocumentoOrmEntity` | Documentos adjuntos |

**Estados válidos**: `'activo'`, `'inactivo'`, `'suspendido'`, `'por certificar'`, `'certificado'`

---

## Puerto: `IEtapaPracticaRepository`

```ts
interface IEtapaPracticaRepository {
  create(data: any): Promise<EtapaPractica>;
  findAll(): Promise<EtapaPractica[]>;
  findById(id: string): Promise<EtapaPractica | null>;
  findByIdWithRelations(id: string): Promise<EtapaPractica | null>;  // incluye empresa y modalidad
  save(etapa: EtapaPractica): Promise<EtapaPractica>;
  deleteById(id: string): Promise<number>;                           // retorna filas afectadas
  updateObservacion(id: string, observacion: string): Promise<void>;
  updateAvance(id: string, avance: number): Promise<void>;
  updateEstado(id: string, estado: string): Promise<void>;
  findByMatriculaId(matriculaId: string): Promise<EtapaPractica | null>; // incluye seguimientos + bitácoras
}
// Token: ETAPA_PRACTICA_REPOSITORY_PORT
```

---

## Filtros de acceso

El repositorio aplica dos filtros en cadena sobre cada consulta:

### 1. `TenantFilter` — aislamiento por centro

Añade `WHERE ep.centroId = :centroId` usando el `centroId` del usuario autenticado. Todos los roles lo reciben.

### 2. `RlsFilter.applyEtapaPractica()` — aislamiento por rol

| Rol | Comportamiento |
|---|---|
| `admin` | Sin filtro adicional — ve todas las etapas del centro |
| `estudiante` | `WHERE ep.matriculaId IN (:...matriculaIds)` — solo sus propias matrículas (extraídas del JWT) |
| `docente` | `INNER JOIN asignaciones WHERE asignaciones.instructor = :personaId AND estado = 'activo'` — solo etapas donde tiene una asignación activa |

> El campo `personaId` del docente viene del JWT (`payload.personaId`), que es el ID de persona en el ERP, **no** el `sub` (ID de usuario). Si `personaId` no está en el token, el sistema cae back al `sub`.

---

## Claves de caché

| Operación | Clave |
|---|---|
| `findAll()` | `etapas` |
| `findById(id)` | `etapas:{id}` |
| `findByIdWithRelations(id)` | `etapas:rel:{id}` |
| `findByMatriculaId(matriculaId)` | `etapas:matricula:{matriculaId}` |

Todas las operaciones de escritura (`create`, `save`, `deleteById`, `updateObservacion`, `updateAvance`, `updateEstado`) invalidan la clave raíz `etapas` (y todas sus variantes en el centro).

---

## Servicio: `EtapaPracticaService`

### `create(dto, token?)` — Flujo de creación en cascada

Esta es la operación más importante del sistema. Sigue 5 pasos en orden:

```
1. [Opcional] Validar avanceMatricula vs. ConfiguracionService.getConfig()
      → Si avanceMatricula < minAvance → BadRequestException

2. Crear EtapaPractica en BD (con empresaId, modalidadId, matriculaId, fechas, estado)

3. Calcular fechas de los 3 seguimientos a partir de fecha_inicio:
      Seg1: fecha_inicio  →  fecha_inicio + 2 meses
      Seg2: fecha_inicio + 2m  →  fecha_inicio + 4 meses
      Seg3: fecha_inicio + 4m  →  fecha_inicio + 6 meses

4. Crear los 3 seguimientos via SeguimientosService.createInternal()
   (estado: 'activo', actas_pdf: 'pendiente')

5. Por cada seguimiento, crear 2 bitácoras via BitacorasService.createInternal()
   Fechas: fecha_inicio_seguimiento + 1 mes y + 2 meses
   (estado: 'pendiente', bitacora_pdf: 'pendiente')
   Total: 6 bitácoras por etapa

6. [Opcional] Si el DTO trae objeto `asignacion`, crear la asignación
   via AsignacionesService.create() con validación al ERP
```

**Retorna**: solo la `EtapaPractica` creada (sin los seguimientos ni bitácoras generados).

---

### `actualizarAvance(id)` — Cálculo de progreso

Recorre todos los seguimientos de la etapa y cuenta las bitácoras:

```
avance = round((bitácoras_aceptadas / total_bitácoras) * 100)
```

- Máximo 100%.
- Si no hay bitácoras → `avance = 0`.
- Persiste el valor calculado con `updateAvance()`.
- **Retorna**: `{ avance: number }`

---

### `cambiarEstado(id, nuevoEstado)`

Valida que el estado sea uno de: `'activo'`, `'inactivo'`, `'suspendido'`, `'por certificar'`, `'certificado'`. Lanza `BadRequestException` si el valor no es válido. No valida la transición de estado (cualquier estado puede pasar a cualquier otro).

---

### `activar(id)` / `inactivar(id)`

Atajos que llaman a `updateEstado`. Lanzan `BadRequestException` si la etapa ya está en el estado destino.

---

### `buscarPorMatricula(matriculaId)`

Busca usando `findByMatriculaId()` del repositorio. Este método hace un `leftJoin` profundo que incluye seguimientos y sus bitácoras, útil para que el frontend muestre el estado completo de una práctica.

---

### `update(id, dto)`

Usa `findByIdWithRelations` para cargar la entidad con sus relaciones antes de hacer el merge. Permite cambiar `empresaId` y `modalidadId` (se convierten a referencias `{ id }` antes de guardar).

---

## Controlador: `EtapaPracticaController`

**Prefijo**: `/api2/etapa-practica`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crear etapa (con cascade de seguimientos y bitácoras) |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Listar (con filtro por `x-matricula-id` header) |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener una etapa |
| `PATCH` | `/:id` | `admin`, `docente` | Actualizar campos |
| `PATCH` | `/:id/estado` | `admin`, `docente` | Cambiar estado (body: `{ "estado": "..." }`) |
| `PATCH` | `/:id/activar` | `admin` | Activar etapa |
| `PATCH` | `/:id/inactivar` | `admin` | Inactivar etapa |
| `PATCH` | `/:id/observacion` | `admin`, `docente` | Actualizar observación (body: `{ "observacion": "..." }`) |
| `PATCH` | `/avance/:id` | `admin`, `docente` | Recalcular avance desde bitácoras |
| `DELETE` | `/:id` | `admin` | Eliminar etapa |
| `GET` | `/matricula/:matriculaId` | `admin`, `docente`, `estudiante` | Buscar por matrícula (con relaciones completas) |

> `GET /` acepta el header opcional `x-matricula-id`: si está presente, delega en `buscarPorMatricula()`; si no, lista todas.

---

### `POST /api2/etapa-practica`

**Body**:
```json
{
  "empresaId": "uuid-empresa",
  "modalidadId": "uuid-modalidad",
  "matriculaId": "uuid-matricula",
  "fecha_inicio": "2024-01-15",
  "fecha_fin": "2024-07-15",
  "estado": "activo",
  "observacion": "Inicio de práctica",
  "avanceMatricula": 75,
  "asignacion": {
    "instructor": "uuid-persona-instructor",
    "fecha_inicio": "2024-01-15",
    "fecha_fin": "2024-07-15",
    "estado": "activo",
    "horas": 80
  }
}
```

- `avanceMatricula` y `asignacion` son **opcionales**.
- Si `avanceMatricula` < `minAvance` configurado → `400 Bad Request`.
- El campo `asignacion` crea la asignación del instructor en el mismo request y llama al ERP para validar que el instructor existe.

**Respuesta exitosa (`201`)**: objeto `EtapaPractica` (sin los seguimientos/bitácoras creados).

**Error avance insuficiente (`400`)**:
```json
{
  "message": "El aprendiz no cumple el avance mínimo requerido (70%). Avance actual: 65%"
}
```

---

### `PATCH /api2/etapa-practica/:id/estado`

```json
{ "estado": "por certificar" }
```

Valores válidos: `"activo"`, `"inactivo"`, `"suspendido"`, `"por certificar"`, `"certificado"`.

---

### `PATCH /api2/etapa-practica/avance/:id`

No requiere body. El servidor calcula el avance sumando las bitácoras con `estado = 'aceptada'` sobre el total de bitácoras en todos los seguimientos.

**Respuesta**: `{ "avance": 33 }`

---

## Dependencias

### Módulos importados

| Módulo | Por qué se importa |
|---|---|
| `SeguimientosModule` | Inyecta `SeguimientosService` para crear seguimientos y consultarlos al calcular avance |
| `BitacorasModule` | Inyecta `BitacorasService` para crear bitácoras y contarlas al calcular avance |
| `AsignacionesModule` | Inyecta `AsignacionesService` para crear la asignación opcional al crear la etapa |
| `ConfiguracionModule` | Inyecta `ConfiguracionService` para leer el `minAvance` al crear una etapa |

### Externas

Ninguna llamada HTTP directa. Las llamadas al ERP (validación del instructor al crear la asignación) las realiza `AsignacionesService` internamente.

### Módulos que dependen de `EtapaPracticaModule`

- `ObservacionesModule` — consulta seguimientos de una etapa para crear observaciones en la última fase.
- El resto de módulos (`Seguimientos`, `Bitácoras`, etc.) referencian `EtapaPracticaOrmEntity` vía relaciones TypeORM, pero no importan este módulo directamente.

---

## Notas de diseño

- **Creación en cascada sin transacción explícita**: Los 3 seguimientos y 6 bitácoras se crean secuencialmente en la capa de aplicación, no dentro de una transacción de BD. Si una de las creaciones falla a mitad, la etapa y los seguimientos previos quedan en la BD sin revertirse. Considerar envolver en `dataSource.transaction()` si la consistencia es crítica.
- **`findByMatriculaId` retorna uno solo**: El tipo de retorno es `EtapaPractica | null` (no array). Se asume que un `matriculaId` tiene como máximo una etapa práctica activa.
- **`toDomain()` aplana bitácoras**: El mapper extrae `bitacoras` de todos los seguimientos y las expone como un array plano en `p['bitacoras']`, accesible por el cliente sin navegar la jerarquía seguimiento → bitácoras.
- **DEBUG temporal en `findAll()`**: La línea `console.log('[EP-DEBUG] ...')` en el repositorio es temporal y debería eliminarse antes de producción.
- **`token?` heredado**: El parámetro `token?` en `create()` se pasa a `asignacionesService.create()` para la validación del instructor en el ERP. El `AsignacionesService` lo requiere pero el `MunicipioHttpAdapter` ya lo extrae del contexto directamente — existe una inconsistencia entre adaptadores que puede unificarse.
