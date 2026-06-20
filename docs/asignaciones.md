# Módulo: Asignaciones

## Propósito

Gestiona la asignación de instructores a una etapa práctica. Antes de crear o actualizar una asignación, valida que el instructor exista en el ERP externo. El campo `instructor` almacena el **ID de persona** del instructor (no el ID de usuario), que es el mismo valor que usa `RlsFilter` para filtrar las etapas y recursos visibles por un docente.

Este módulo es exportado y consumido directamente por `EtapaPracticaModule` para crear la asignación opcional durante la creación de una etapa.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `asignaciones.module.ts` | Declara el módulo, vincula los dos puertos con sus adaptadores, importa `HttpModule` y **exporta** `AsignacionesService` |
| `infrastructure/http/asignaciones.controller.ts` | 6 endpoints REST con control de roles |
| `application/asignaciones.service.ts` | Valida instructor vía ERP y delega CRUD al repositorio |
| `domain/entities/asignacion.entity.ts` | Entidad de dominio pura |
| `domain/ports/asignacion.repository.port.ts` | Interfaz `IAsignacionRepository` + token |
| `domain/ports/persona.service.port.ts` | Interfaz `IPersonaServicePort` + token |
| `infrastructure/entities/asignacion.orm-entity.ts` | Entidad TypeORM con relación a `EtapaPractica` |
| `infrastructure/adapters/asignacion.typeorm.repository.ts` | Implementa el repositorio con `TenantFilter`, `RlsFilter` y caché |
| `infrastructure/adapters/persona.http.adapter.ts` | Implementa `IPersonaServicePort` llamando al ERP |
| `infrastructure/http/dto/create-asignacione.dto.ts` | Validación de creación (incluye conversión segura de `horas` a entero) |
| `infrastructure/http/dto/update-asignacione.dto.ts` | Extiende con todos los campos opcionales |

---

## Entidades

### Dominio: `Asignacion`

```ts
class Asignacion {
  id: string;
  instructor: string;    // UUID del personaId del instructor en el ERP
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;        // 'activo' | 'inactivo'
  horas: number;
  etapa?: { id: string };
}
```

### ORM: `AsignacionOrmEntity`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | Identificador único |
| `centroId` | `uuid` | Centro de formación (multi-tenancy) |
| `sedeId` | `uuid` (nullable) | Sede opcional |
| `instructor` | `text` | UUID del personaId del instructor en el ERP |
| `fecha_inicio` | `date` | Inicio de la asignación |
| `fecha_fin` | `date` | Fin de la asignación |
| `estado` | `text` | default `'activo'` |
| `horas` | `int` | Horas asignadas (mínimo 1) |
| `etapa` | `ManyToOne → EtapaPracticaOrmEntity` | Etapa a la que pertenece |

---

## Puertos del dominio

### `IAsignacionRepository`

```ts
interface IAsignacionRepository {
  create(data: Partial<Asignacion> & { etapa: { id: string } }): Promise<Asignacion>;
  findAll(): Promise<Asignacion[]>;
  findById(id: string): Promise<Asignacion | null>;
  findByEtapaId(etapaId: string): Promise<Asignacion[]>;
  save(asignacion: Asignacion): Promise<Asignacion>;
  deleteById(id: string): Promise<number>;
}
// Token: ASIGNACION_REPOSITORY_PORT
```

### `IPersonaServicePort`

```ts
interface IPersonaServicePort {
  buscarPersona(idPersona: string, token: string): Promise<any | null>;
}
// Token: PERSONA_SERVICE_PORT
```

---

## Adaptador externo: `PersonaHttpAdapter`

Implementa `IPersonaServicePort`. Llama al ERP para verificar que un instructor existe.

**URL base**: `http://localhost:3000/api/personas` (hardcodeada, no usa `ERP_API_URL` como `MunicipioHttpAdapter`).

**Token**: A diferencia de `MunicipioHttpAdapter`, este adaptador **recibe el token como parámetro** del servicio (no lo extrae del contexto). Normaliza el prefijo: si el token ya viene con `"Bearer "` no lo duplica.

**Comportamiento**:
- `GET /{idPersona}` con header `Authorization: Bearer <token>`
- `404` → retorna `null`
- Otro error → lanza `InternalServerErrorException`

> **Inconsistencia a revisar**: `MunicipioHttpAdapter` lee el token del `RequestContextService`; `PersonaHttpAdapter` lo recibe como parámetro. Ambos deberían usar el mismo patrón.

---

## Repositorio: `AsignacionTypeOrmRepository`

### Filtros aplicados en lecturas

Todas las consultas de lista (`findAll`, `findById`, `findByEtapaId`) aplican:

1. `TenantFilter.apply(qb, 'asig')` — filtra por `centroId`
2. `RlsFilter.applyAsignacion(qb, 'asig')` — filtra por rol:

| Rol | Filtro adicional |
|---|---|
| `admin` | Sin filtro — ve todas las asignaciones del centro |
| `docente` | `WHERE asig.instructor = :personaId AND asig.estado = 'activo'` |
| `estudiante` | `INNER JOIN etapa WHERE etapa.matriculaId IN (:...matriculaIds)` |

> **Excepción**: `findByEtapaId()` solo aplica `TenantFilter`, **no** aplica `RlsFilter`. Está pensado para uso administrativo (listar instructores de una etapa específica).

### Claves de caché

| Operación | Clave |
|---|---|
| `findAll()` | `asignaciones` |
| `findById(id)` | `asignaciones:{id}` |
| `findByEtapaId(etapaId)` | `asignaciones:etapa:{etapaId}` |

Mutaciones (`create`, `save`, `deleteById`) invalidan `asignaciones` (y todas sus variantes del centro).

### Mapper `toDomain()`

Omite `centroId` y `sedeId`. Preserva la referencia a la etapa como `{ id }` si existe.

---

## Servicio: `AsignacionesService`

### `create(dto, token)`

1. Valida que el token no esté vacío (lanza `UnauthorizedException` si falta).
2. Llama a `personaService.buscarPersona(dto.instructor, token)`.
3. Si la persona no existe → `BadRequestException: "El instructor con ID X no existe"`.
4. Separa `etapaId` del resto del DTO y crea la asignación con referencia `etapa: { id: etapaId }`.

### `findAll()`

Lista todas las asignaciones visibles para el rol del usuario actual (filtro RLS aplicado en el repositorio).

### `findByEtapa(etapaId)`

Lista todas las asignaciones de una etapa concreta. No aplica RLS de rol (solo tenant).

### `findOne(id)`

Busca por UUID con RLS de rol. Lanza `NotFoundException` si no existe o no es visible.

### `update(id, dto, token)`

1. Verifica que la asignación exista con `findOne`.
2. Si el DTO trae `instructor`, valida que exista en el ERP.
3. Separa `etapaId`, hace merge de campos y guarda.

### `remove(id)`

Llama a `deleteById`. Si `affected === 0` lanza `NotFoundException`.

---

## Controlador: `AsignacionesController`

**Prefijo**: `/api2/asignaciones`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crear asignación (requiere token explícito) |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Listar (filtrado por RLS) |
| `GET` | `/etapa/:etapaId` | `admin`, `docente` | Listar asignaciones de una etapa |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener una asignación |
| `PATCH` | `/:id` | `admin` | Actualizar (valida instructor si cambia) |
| `DELETE` | `/:id` | `admin` | Eliminar |

> `POST` y `PATCH` extraen el token del request (`req.cookies?.token` o `Authorization` header) y lo pasan al servicio para reenviar al ERP. Si el token falta lanzan `UnauthorizedException` antes de llegar al servicio.

---

### `POST /api2/asignaciones`

**Headers requeridos**: `Authorization: Bearer <token>` o cookie `token`.

**Body**:
```json
{
  "instructor": "uuid-persona-instructor",
  "fecha_inicio": "2024-01-15",
  "fecha_fin": "2024-07-15",
  "estado": "activo",
  "horas": 80,
  "etapaId": "uuid-etapa-practica"
}
```

- `estado`: `"activo"` o `"inactivo"`.
- `horas`: entero ≥ 1. El DTO usa `@Type(() => Number)` + `@Transform` para aceptar tanto número JSON como string numérico.

**Respuesta exitosa (`201`)**:
```json
{
  "id": "uuid-generado",
  "instructor": "uuid-persona-instructor",
  "fecha_inicio": "2024-01-15",
  "fecha_fin": "2024-07-15",
  "estado": "activo",
  "horas": 80,
  "etapa": { "id": "uuid-etapa-practica" }
}
```

**Error instructor no existe (`400`)**:
```json
{ "message": "El instructor con ID uuid-... no existe" }
```

---

### `GET /api2/asignaciones/etapa/:etapaId`

Retorna todas las asignaciones de una etapa. No filtra por rol del docente — devuelve todos los instructores asignados a esa etapa.

---

## Rol del módulo en `RlsFilter`

El campo `asignacion.instructor` es el **pivote** que conecta a un docente con sus etapas prácticas. `RlsFilter.applyEtapaPractica()` hace un `INNER JOIN` a la tabla de asignaciones buscando `instructor = user.personaId`. Por eso:

- Solo las asignaciones con `estado = 'activo'` dan acceso al docente.
- Inactivar una asignación (`PATCH /:id` con `estado: 'inactivo'`) quita al docente el acceso a esa etapa, sus seguimientos, bitácoras y observaciones.

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `AppCacheService` | Caché de lecturas con invalidación en mutaciones |
| `TenantFilter` | Aislamiento por `centroId` |
| `RlsFilter.applyAsignacion()` | Filtro por rol en lecturas individuales y de lista |

### Externas

| Servicio | Endpoint | Cuándo |
|---|---|---|
| ERP externo | `GET http://localhost:3000/api/personas/:id` | Al crear o actualizar si cambia el `instructor` |

### Módulos que consumen `AsignacionesModule`

`EtapaPracticaModule` — importa este módulo e inyecta `AsignacionesService` para crear la asignación opcional al crear una etapa y para consultar asignaciones al calcular el avance vía `RlsFilter`.

---

## Notas de diseño

- **`instructor` como UUID de persona, no de usuario**: El campo almacena el `personaId` del ERP, no el `idUsuario`. El JWT del docente debe incluir `personaId` en su payload para que el `RlsFilter` funcione. Si el token solo trae `sub` (idUsuario), el filtro cae back al `sub` y puede no coincidir.
- **URL hardcodeada en `PersonaHttpAdapter`**: A diferencia de `MunicipioHttpAdapter` que usa `ERP_API_URL`, este adaptador tiene la URL fija en el código. Si el ERP cambia de host, hay que modificar el archivo.
- **`horas` con doble transformación**: El DTO usa `@Type(() => Number)` y `@Transform` con `Math.floor()` para garantizar que nunca se guarde un decimal, independientemente de si el cliente envía `"80"` (string) o `80` (número).
