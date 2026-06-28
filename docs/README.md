# Documentación técnica — `nest-backend-epsas`

Documentación técnica completa del backend NestJS del sistema EPSAS. Generada a partir del código fuente tras el análisis y corrección de los 9 módulos.

---

## Módulos documentados

| # | Módulo | Archivo | Descripción |
|---|---|---|---|
| 1 | `asignaciones` | [01-asignaciones.md](modules/01-asignaciones.md) | Asignaciones de instructores a etapas de práctica |
| 2 | `bitacoras` | [02-bitacoras.md](modules/02-bitacoras.md) | Bitácoras de aprendices con soporte PDF |
| 3 | `configuracion` | [03-configuracion.md](modules/03-configuracion.md) | Configuración global por centro (arquitectura plana) |
| 4 | `documento-practica` | [04-documento-practica.md](modules/04-documento-practica.md) | Documentos adjuntos a etapas de práctica |
| 5 | `empresa` | [05-empresa.md](modules/05-empresa.md) | Empresas de práctica con validación de municipio en ERP externo |
| 6 | `etapa_practica` | [06-etapa-practica.md](modules/06-etapa-practica.md) | Módulo central: etapas de práctica de los aprendices |
| 7 | `formatos` | [07-formatos.md](modules/07-formatos.md) | Plantillas y formatos asociados a etapas |
| 8 | `observaciones` | [08-observaciones.md](modules/08-observaciones.md) | Observaciones de seguimiento con evidencia fotográfica |
| 9 | `seguimientos` | [09-seguimientos.md](modules/09-seguimientos.md) | Seguimientos periódicos con actas PDF e integración ERP |

---

## Convenciones del proyecto

### Arquitectura hexagonal (Ports & Adapters)

Todos los módulos (excepto `configuracion`) siguen esta estructura:

```
domain/         ← Entidades puras + contratos (interfaces/ports)
application/    ← Lógica de negocio + Commands (interfaces de entrada)
infrastructure/ ← TypeORM + HTTP adapters + Controllers + DTOs
```

**Regla clave:** El servicio (`application/`) solo importa desde `domain/` y `application/dto/`. Nunca importa desde `infrastructure/`.

### Multi-tenancy

Cada request lleva `centroId` en el contexto (via `TenantFilter.getCurrentCentroId()`). Todas las operaciones de base de datos filtran o asignan `centroId`:

- **Lecturas:** `TenantFilter.apply(qb, alias)` en el QueryBuilder
- **Inserciones:** `centroId: TenantFilter.getCurrentCentroId()` en el `create()`
- **Mutaciones:** `.andWhere('centroId = :centroId', { centroId })` en los UPDATE
- **Eliminaciones:** `this.orm.delete({ id, centroId })`

### Validación de fechas

Todos los campos `Date` en DTOs usan el par obligatorio:
```ts
@Type(() => Date)
@IsDate()
```
`@IsDateString()` no se usa porque no transforma el valor — el campo llegaría como `string` al servicio.

### Commands vs DTOs

| Tipo | Ubicación | Propósito |
|---|---|---|
| `CreateXCommand` | `application/dto/` | Interfaz de entrada para el servicio (sin decoradores) |
| `UpdateXCommand` | `application/dto/` | `Partial<CreateXCommand>` o interfaz explícita si hay campos no actualizables |
| `CreateXDto` | `infrastructure/http/dto/` | Clase con decoradores de `class-validator` para validación HTTP |
| `UpdateXDto` | `infrastructure/http/dto/` | `PartialType(CreateXDto)` — hereda decoradores automáticamente |

### Roles disponibles

| Rol | Descripción |
|---|---|
| `admin` | Acceso completo — CRUD |
| `docente` | Lectura + creación + actualización — sin eliminación |
| `estudiante` | Solo lectura |

### Integración con ERP externo

Los módulos que consultan el ERP externo (`empresa`, `seguimientos`) usan adaptadores HTTP que obtienen el token JWT con `RequestContextService.getRawToken()` — el token **nunca** se pasa como parámetro entre capas.

---

## Dependencias entre módulos

```
etapa_practica
    ├── ← asignaciones (crea asignaciones anidadas)
    ├── ← empresa (valida empresa de práctica)
    ├── → seguimientos (tiene seguimientos)
    │       ├── → bitacoras
    │       └── → observaciones
    ├── → formatos
    └── → documentos-practica

seguimientos → observaciones (SeguimientosService exportado a ObservacionesModule)
empresa → ERP externo (validación de municipio)
seguimientos → ERP externo (listado de matrículas por alumno)
```
