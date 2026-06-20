# Módulo: Empresa

## Propósito

Gestiona las empresas u organizaciones donde los aprendices realizan su etapa práctica. Antes de crear o actualizar una empresa, el módulo valida que el municipio informado exista en el sistema ERP externo. Cada empresa pertenece a un centro de formación (`centroId`) y puede tener múltiples etapas prácticas asociadas.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `empresa.module.ts` | Declara el módulo, registra la entidad ORM, vincula ambos puertos (repositorio + municipio) con sus adaptadores e importa `HttpModule` para llamadas externas |
| `infrastructure/http/empresa.controller.ts` | Expone los 5 endpoints REST bajo `/empresas` con control de roles |
| `application/empresa.service.ts` | Orquesta validación de municipio + operaciones CRUD |
| `domain/entities/empresa.entity.ts` | Entidad de dominio pura (sin decoradores ORM ni campos de tenant) |
| `domain/ports/empresa.repository.port.ts` | Interfaz `IEmpresaRepository` + token `EMPRESA_REPOSITORY_PORT` |
| `domain/ports/municipio.service.port.ts` | Interfaz `IMunicipioServicePort` + token `MUNICIPIO_SERVICE_PORT` |
| `infrastructure/entities/empresa.orm-entity.ts` | Entidad TypeORM con campos de tenancy y relación a `EtapaPractica` |
| `infrastructure/adapters/empresa.typeorm.repository.ts` | Implementa `IEmpresaRepository` con TypeORM, `TenantFilter` y `AppCacheService` |
| `infrastructure/adapters/municipio.http.adapter.ts` | Implementa `IMunicipioServicePort` llamando al ERP externo vía HTTP |
| `infrastructure/http/dto/create-empresa.dto.ts` | Validación y tipos del body de creación |
| `infrastructure/http/dto/update-empresa.dto.ts` | Extiende `CreateEmpresaDto` con todos los campos opcionales |

---

## Entidades

### Dominio: `Empresa`

```ts
class Empresa {
  id: string;
  nit: string;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  municipio: string;   // ID del municipio en el ERP externo
  estado: string;
  longitud: number;
  latitud: number;
  tipo: string;
}
```

La capa de dominio no expone `centroId` ni `sedeId`. El mapper `toDomain()` los filtra.

### ORM: `EmpresaOrmEntity` — tabla `empresas`

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | `uuid` (PK) | generado | Identificador único |
| `centroId` | `uuid` | NOT NULL | Centro de formación (multi-tenancy) |
| `sedeId` | `uuid` | nullable | Sede dentro del centro |
| `nit` | `int` | UNIQUE | NIT de la empresa |
| `nombre` | `text` | | Razón social |
| `direccion` | `text` | | Dirección física |
| `telefono` | `text` | | Teléfono de contacto |
| `correo` | `text` | | Correo electrónico |
| `municipio` | `text` | | ID del municipio (referencia al ERP externo) |
| `estado` | `text` | default `'activo'` | Estado de la empresa |
| `longitud` | `decimal(10,7)` | nullable | Coordenada geográfica |
| `latitud` | `decimal(10,7)` | nullable | Coordenada geográfica |
| `tipo` | `text` | | `'unipersonal'` o `'empresa'` |
| `etapas` | `OneToMany → EtapaPracticaOrmEntity` | | Etapas prácticas en esta empresa |

---

## Puertos del dominio

### `IEmpresaRepository`
```ts
interface IEmpresaRepository {
  create(empresa: Partial<Empresa>): Promise<Empresa>;
  findAll(): Promise<Empresa[]>;
  findById(id: string): Promise<Empresa | null>;
  save(empresa: Empresa): Promise<Empresa>;
  remove(empresa: Empresa): Promise<void>;
}
// Token: EMPRESA_REPOSITORY_PORT
```

### `IMunicipioServicePort`
```ts
interface IMunicipioServicePort {
  buscarMunicipio(idMunicipio: string, token: string): Promise<any | null>;
}
// Token: MUNICIPIO_SERVICE_PORT
```

---

## Adaptador externo: `MunicipioHttpAdapter`

Implementa `IMunicipioServicePort`. Llama al ERP externo para verificar que un municipio existe antes de crear o actualizar una empresa.

**URL base**: `${ERP_API_URL}/municipios` (fallback: `http://localhost:3000/api/municipios`)

**Token**: Lo obtiene directamente de `RequestContextService.getRawToken()` — ya no lo recibe como parámetro del servicio. El parámetro `_token` del método es ignorado.

**Comportamiento**:
- `GET /{idMunicipio}` con header `Authorization: Bearer <token>`
- Si responde `404` → retorna `null` (municipio no encontrado)
- Cualquier otro error → lanza `InternalServerErrorException`

---

## Repositorio: `EmpresaTypeOrmRepository`

Mismo patrón que `ModalidadTypeOrmRepository`:

| Operación | Caché |
|---|---|
| `findAll()` | Clave `empresas`. Hit → retorna directo. Miss → consulta BD y guarda. |
| `findById(id)` | Clave `empresas:{id}`. Mismo patrón. |
| `create()` | Guarda con `centroId` del contexto. Invalida `empresas`. |
| `save()` | Actualiza en BD. Invalida `empresas`. |
| `remove()` | Elimina. Invalida `empresas`. |

El mapper `toDomain()` copia todos los campos del dominio pero omite `centroId`, `sedeId` y la relación `etapas`.

---

## Servicio: `EmpresaService`

### `create(dto, token?)`

1. Llama a `municipioService.buscarMunicipio(dto.municipio, token)`.
2. Si retorna `null` → `BadRequestException: "El municipio con ID X no existe"`.
3. Si el municipio existe → persiste la empresa vía repositorio.

> **Nota**: El `token` ya no se recibe del controlador (el controller no lo pasa). El `MunicipioHttpAdapter` lo extrae internamente de `RequestContextService`. El parámetro `token?` quedó como compatibilidad.

### `findAll()`
Lista todas las empresas del centro actual. La caché absorbe lecturas repetidas.

### `findOne(id)`
Busca por UUID. Lanza `NotFoundException` si no existe.

### `update(id, dto, token?)`
1. Verifica que la empresa exista con `findOne`.
2. Si el DTO trae `municipio`, valida que exista en el ERP.
3. Aplica los cambios con spread y guarda.

### `remove(id)`
Verifica existencia y elimina. Retorna `{ message: 'Empresa con id ... eliminada correctamente' }`.

---

## Controlador: `EmpresaController`

**Prefijo**: `/api2/empresas`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crear empresa |
| `GET` | `/` | `admin`, `docente` | Listar todas |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtener una |
| `PATCH` | `/:id` | `admin` | Actualizar |
| `DELETE` | `/:id` | `admin` | Eliminar |

### `POST /api2/empresas` — Solo `admin`

**Body**:
```json
{
  "nit": "900123456",
  "nombre": "Tech Solutions SAS",
  "direccion": "Calle 10 # 5-30",
  "telefono": "3001234567",
  "correo": "contacto@techsolutions.com",
  "municipio": "05001",
  "estado": "activo",
  "longitud": -75.5636,
  "latitud": 6.2442,
  "tipo": "empresa"
}
```

Valores válidos para `tipo`: `"unipersonal"`, `"empresa"`.
Valores válidos para `estado`: `"activo"`, `"inactivo"` (opcional, default `"activo"`).

**Respuesta exitosa (`201`)**:
```json
{
  "id": "uuid-generado",
  "nit": "900123456",
  "nombre": "Tech Solutions SAS",
  "direccion": "Calle 10 # 5-30",
  "telefono": "3001234567",
  "correo": "contacto@techsolutions.com",
  "municipio": "05001",
  "estado": "activo",
  "longitud": -75.5636,
  "latitud": 6.2442,
  "tipo": "empresa"
}
```

**Error municipio no existe (`400`)**:
```json
{ "message": "El municipio con ID 05001 no existe" }
```

**Error NIT duplicado (`400`)**:
```json
{ "message": "Key (nit)=(900123456) already exists." }
```

---

### `GET /api2/empresas` — `admin`, `docente`

Lista todas las empresas del centro del usuario autenticado.

---

### `GET /api2/empresas/:id` — `admin`, `docente`, `estudiante`

Retorna una empresa por UUID. `ParseUUIDPipe` valida el formato.

---

### `PATCH /api2/empresas/:id` — Solo `admin`

Todos los campos son opcionales. Solo se valida el municipio si viene en el body.

---

### `DELETE /api2/empresas/:id` — Solo `admin`

**Respuesta exitosa (`200`)**:
```json
{ "message": "Empresa con id uuid-... eliminada correctamente" }
```

---

## Dependencias

### Internas

| Dependencia | Uso |
|---|---|
| `AppCacheService` | Caché de lecturas con invalidación en mutaciones |
| `TenantFilter` | Filtra por `centroId` en consultas; asigna `centroId` en creación |
| `RequestContextService` | Fuente del token JWT crudo para reenviar al ERP |

### Externas

| Servicio | Endpoint | Cuándo se llama |
|---|---|---|
| ERP externo | `GET ${ERP_API_URL}/municipios/:id` | Al crear o actualizar si el campo `municipio` está presente en el DTO |

### Módulos que dependen de `EmpresaModule`

`EtapaPracticaModule` — la entidad `EtapaPracticaOrmEntity` tiene una relación `ManyToOne` a `EmpresaOrmEntity` y el DTO de creación de etapa incluye `empresaId`.

---

## Notas de diseño

- **`municipio` como texto, no FK**: El campo `municipio` almacena el ID del municipio del ERP como texto, no como clave foránea real. Esto desacopla la BD local del ERP externo: si el ERP cambia, no hay migración de FK que ejecutar.
- **NIT como `int` con `unique`**: La columna está tipada como `int` en la ORM pero el DTO la recibe como `string`. En caso de NITs con prefijos `0` o formatos especiales, este mapeo puede truncar datos — considerar cambiar a `text` si se presentan problemas.
- **Token implícito**: `MunicipioHttpAdapter` obtiene el token del `RequestContextService` directamente, eliminando la necesidad de pasarlo por la cadena controller → service → adapter. El parámetro `token?` en el servicio es un vestigio que puede eliminarse en un refactor futuro.
