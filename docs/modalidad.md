# Módulo: Modalidad

## Propósito

Gestiona los tipos de modalidad bajo los que un aprendiz puede realizar su etapa práctica. Los valores posibles son un conjunto fijo definido en el DTO. Cada modalidad pertenece a un centro de formación (`centroId`) y puede ser referenciada por múltiples `EtapaPractica`.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `module.ts` | Declara el módulo, registra la entidad ORM, vincula el token de repositorio con su implementación TypeORM y provee `AppCacheService` localmente |
| `infrastructure/http/modalidad.controller.ts` | Expone los endpoints REST CRUD bajo el prefijo `/modalidad` |
| `application/modalidad.service.ts` | Orquesta la lógica de negocio delegando en el repositorio a través del puerto |
| `domain/entities/modalidad.entity.ts` | Entidad de dominio pura: solo `id` y `nombre` |
| `domain/ports/modalidad.repository.port.ts` | Interfaz `IModalidadRepository` + token de inyección |
| `infrastructure/entities/modalidad.orm-entity.ts` | Entidad TypeORM con los campos de infraestructura (`centroId`, `sedeId`) |
| `infrastructure/adapters/modalidad.typeorm.repository.ts` | Implementa `IModalidadRepository` con TypeORM, `TenantFilter` y `AppCacheService` |
| `infrastructure/http/dto/create-modalidad.dto.ts` | Valida que `nombre` sea uno de los valores permitidos |
| `infrastructure/http/dto/update-modalidad.dto.ts` | Extiende `CreateModalidadDto` con todos los campos opcionales (`PartialType`) |

---

## Entidades

### Dominio: `Modalidad`

```ts
class Modalidad {
  id: string;
  nombre: string;
}
```

El dominio no expone `centroId` ni `sedeId`; esos son detalles de infraestructura filtrados por `toDomain()`.

### ORM: `ModalidadOrmEntity` — tabla `modalidades`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK, generado) | Identificador único |
| `centroId` | `uuid` | Centro de formación al que pertenece (multi-tenancy) |
| `sedeId` | `uuid` (nullable) | Sede opcional dentro del centro |
| `nombre` | `text` (unique) | Nombre de la modalidad. Restricción única en BD |
| `modalidades` | `OneToMany → EtapaPracticaOrmEntity` | Etapas prácticas que usan esta modalidad |

---

## Puerto: `IModalidadRepository`

```ts
interface IModalidadRepository {
  create(data: Partial<Modalidad>): Promise<Modalidad>;
  findAll(): Promise<Modalidad[]>;
  findById(id: string): Promise<Modalidad | null>;
  save(modalidad: Modalidad): Promise<Modalidad>;
  remove(modalidad: Modalidad): Promise<void>;
}
```

Token de inyección: `MODALIDAD_REPOSITORY_PORT`

---

## Repositorio: `ModalidadTypeOrmRepository`

Implementa `IModalidadRepository`. Dos responsabilidades clave:

### Multi-tenancy con `TenantFilter`

- **En lecturas**: `TenantFilter.apply(qb, 'mod')` añade `WHERE mod.centroId = :centroId` usando el `centroId` del request (vía `RequestContextService`). Si no hay `centroId` en sesión lanza `ForbiddenException`.
- **En creación**: `TenantFilter.getCurrentCentroId()` obtiene el `centroId` actual y lo asigna al nuevo registro.

### Caché con `AppCacheService`

| Operación | Comportamiento de caché |
|---|---|
| `findAll()` | Lee de caché con clave `modalidades`. Si hay hit, retorna directo. Si no, consulta BD y guarda en caché. |
| `findById(id)` | Lee de caché con clave `modalidades:{id}`. Mismo patrón. |
| `create()` | Guarda en BD e invalida la clave `modalidades` (y todas sus variantes en el centro). |
| `save()` | Actualiza en BD e invalida caché. |
| `remove()` | Elimina de BD e invalida caché. |

TTL efectivo: 30 segundos (definido en `AppCacheService`).

### Mapper `toDomain()`

Convierte `ModalidadOrmEntity` → `Modalidad` omitiendo los campos de infraestructura:

```ts
private toDomain(e: ModalidadOrmEntity): Modalidad {
  const m = new Modalidad();
  m.id = e.id;
  m.nombre = e.nombre;
  return m;
}
```

---

## Servicio: `ModalidadService`

| Método | Descripción |
|---|---|
| `create(dto)` | Crea la modalidad. Captura error `23505` (nombre duplicado) y lanza `BadRequestException`. |
| `findAll()` | Lista todas las modalidades del centro actual. |
| `findOne(id)` | Busca por UUID. Lanza `NotFoundException` si no existe. |
| `update(id, dto)` | Carga la entidad existente, aplica los cambios del DTO (spread) y guarda. |
| `remove(id)` | Valida existencia y elimina. Retorna `{ message: 'Modalidad con id ... eliminada correctamente' }`. |

---

## Controlador: `ModalidadController`

**Prefijo**: `/api2/modalidad`

> Ningún endpoint tiene `@Roles()`, por lo que el **RLS Guard global** solo exige que exista usuario autenticado. Cualquier rol (`admin`, `docente`, `estudiante`) puede acceder a todos los endpoints.

### `POST /api2/modalidad`

Crea una modalidad nueva.

**Body**:
```json
{ "nombre": "pasantia" }
```

Valores válidos para `nombre`: `"proyecto productivo"`, `"pasantia"`, `"monitoria"`, `"contrato de aprendizaje"`.

**Respuesta exitosa (`201`)**:
```json
{
  "id": "a1b2c3d4-...",
  "nombre": "pasantia"
}
```

**Error si nombre duplicado (`400`)**:
```json
{ "message": "Key (nombre)=(pasantia) already exists." }
```

---

### `GET /api2/modalidad`

Lista todas las modalidades del centro del usuario autenticado.

**Respuesta exitosa (`200`)**:
```json
[
  { "id": "a1b2c3d4-...", "nombre": "pasantia" },
  { "id": "e5f6g7h8-...", "nombre": "monitoria" }
]
```

---

### `GET /api2/modalidad/:id`

Obtiene una modalidad por su UUID.

**Parámetro**: `id` — UUID validado con `ParseUUIDPipe`.

**Respuesta exitosa (`200`)**:
```json
{ "id": "a1b2c3d4-...", "nombre": "pasantia" }
```

**Error si no existe (`404`)**:
```json
{ "message": "Modalidad con id a1b2... no encontrada" }
```

---

### `PATCH /api2/modalidad/:id`

Actualiza el nombre de una modalidad existente.

**Body** (todos los campos opcionales):
```json
{ "nombre": "contrato de aprendizaje" }
```

**Respuesta exitosa (`200`)**:
```json
{ "id": "a1b2c3d4-...", "nombre": "contrato de aprendizaje" }
```

---

### `DELETE /api2/modalidad/:id`

Elimina una modalidad.

**Respuesta exitosa (`200`)**:
```json
{ "message": "Modalidad con id a1b2c3d4-... eliminada correctamente" }
```

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `AppCacheService` | Caché con Redis/memoria para lecturas frecuentes |
| `TenantFilter` | Aísla datos por `centroId` en lecturas y escrituras |
| `RequestContextService` | Fuente del `centroId` del usuario autenticado |

### Externas

Ninguna llamada HTTP a servicios externos. Solo TypeORM + PostgreSQL.

### Módulos que consumen `ModalidadModule`

`EtapaPracticaModule` importa `ModalidadModule` implícitamente — la entidad ORM `ModalidadOrmEntity` es referenciada como `ManyToOne` desde `EtapaPracticaOrmEntity`, y el `modalidadId` del DTO de etapa practica apunta a un registro de esta tabla.

---

## Notas de diseño

- **Valores controlados**: El uso de `@IsIn([...])` en el DTO en lugar de un enum de TypeScript permite cambiar los valores permitidos sin migraciones de base de datos (la columna es `text`, no `enum`).
- **Unicidad por nombre, no por centro**: La restricción `unique` en `nombre` es global en la tabla, no por `centroId`. Dos centros distintos no pueden tener una modalidad con el mismo nombre. Si se requiere unicidad por centro en el futuro, habría que cambiar la restricción a `UNIQUE(nombre, centroId)`.
- **`centroId` invisible en el dominio**: La capa de dominio no conoce el concepto de multi-tenancy; esa responsabilidad queda encapsulada completamente en el repositorio, cumpliendo el principio de separación de capas de la arquitectura hexagonal.
