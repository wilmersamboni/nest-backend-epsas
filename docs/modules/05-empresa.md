# Módulo: `empresa`

## Descripción general

Gestiona las empresas donde los aprendices realizan su práctica. Permite registrar, listar, actualizar y eliminar empresas, incluyendo la validación de su municipio mediante una consulta al microservicio ERP externo. El NIT se almacena como texto para soportar formatos con guiones y garantizar unicidad.

---

## Arquitectura hexagonal

```
empresa/
├── domain/
│   ├── entities/
│   │   └── empresa.entity.ts              ← Entidad de dominio pura
│   └── ports/
│       ├── empresa.repository.port.ts     ← Contrato IEmpresaRepository
│       └── municipio.service.port.ts      ← Contrato IMunicipioServicePort + MunicipioInfo
├── application/
│   ├── empresa.service.ts                 ← Lógica de negocio
│   └── dto/
│       ├── create-empresa.command.ts      ← Comando de creación
│       └── update-empresa.command.ts      ← Partial del comando de creación
└── infrastructure/
    ├── entities/
    │   └── empresa.orm-entity.ts          ← Entidad TypeORM
    ├── adapters/
    │   ├── empresa.typeorm.repository.ts  ← Implementación del repositorio
    │   └── municipio.http.adapter.ts      ← Adapter HTTP hacia el ERP externo
    └── http/
        ├── empresa.controller.ts          ← Controlador REST
        └── dto/
            ├── create-empresa.dto.ts      ← DTO de entrada con validación
            └── update-empresa.dto.ts      ← PartialType del DTO de creación
```

---

## Capa de dominio

### Entidad `Empresa`

```ts
export class Empresa {
  id: string;
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  correo: string;
  municipio: string;
  sector: string;
  estado: string;
}
```

### Puerto `IEmpresaRepository`

| Método | Firma | Descripción |
|---|---|---|
| `create` | `(data: CreateEmpresaCommand) → Promise<Empresa>` | Inserta con `centroId` del tenant |
| `findAll` | `() → Promise<Empresa[]>` | Lista con tenant filter y caché |
| `findById` | `(id: string) → Promise<Empresa \| null>` | Busca con tenant filter |
| `save` | `(e: Empresa) → Promise<Empresa>` | Actualiza con tenant filter |
| `deleteById` | `(id: string) → Promise<number>` | Elimina con `{ id, centroId }` |

### Puerto `IMunicipioServicePort`

```ts
export interface MunicipioInfo {
  id: string;
  nombre: string;
  departamento?: string;
}

export interface IMunicipioServicePort {
  buscarMunicipio(idMunicipio: string): Promise<MunicipioInfo | null>;
}
```

No recibe `token` — el adapter obtiene el JWT directamente desde `RequestContextService.getRawToken()`.

---

## Capa de aplicación

### Commands

**`create-empresa.command.ts`**
```ts
export interface CreateEmpresaCommand {
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  correo: string;
  municipio: string;
  sector: string;
  estado?: string;
}
```

**`update-empresa.command.ts`**
```ts
export type UpdateEmpresaCommand = Partial<CreateEmpresaCommand>;
```

### Servicio `EmpresaService`

| Método | Descripción |
|---|---|
| `create(dto)` | Valida el municipio en el ERP externo antes de insertar. Lanza `BadRequestException` si no existe |
| `findAll()` | Delega al repositorio |
| `findOne(id)` | Lanza `NotFoundException` si no existe |
| `update(id, dto)` | Valida municipio si se actualiza, luego delega al repositorio |
| `remove(id)` | Verifica existencia y elimina |

---

## Capa de infraestructura

### Repositorio TypeORM `EmpresaTypeOrmRepository`

- Datasource dinámico via `RequestContextService.getDataSource()`
- `create()`: asigna `centroId: TenantFilter.getCurrentCentroId()`
- `findAll()` / `findById()`: QueryBuilder + `TenantFilter.apply(qb, 'e')` + caché
- `deleteById()`: `this.orm.delete({ id, centroId })`

### Adapter HTTP `MunicipioHttpAdapter`

- Llama al ERP en `GET /municipios/:id`
- Obtiene el token internamente con `RequestContextService.getRawToken()` — no recibe `token` como parámetro
- Devuelve `MunicipioInfo` o `null` si recibe 404

### ORM Entity `EmpresaOrmEntity`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK generada |
| `centroId` | `uuid` | Filtro multi-tenant |
| `sedeId` | `uuid nullable` | Filtro RLS |
| `nombre` | `text` | |
| `nit` | `text` | `unique: true` — texto para soportar formatos con guiones |
| `direccion` | `text` | |
| `telefono` | `text` | |
| `correo` | `text` | |
| `municipio` | `text` | ID del municipio validado en el ERP |
| `sector` | `text` | |
| `estado` | `text` | |

---

## API REST

### Controller `EmpresaController`

**Base path:** `/api2/empresa`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/` | `admin` | Crea una nueva empresa |
| `GET` | `/` | `admin`, `docente`, `estudiante` | Lista todas las empresas del tenant |
| `GET` | `/:id` | `admin`, `docente`, `estudiante` | Obtiene una empresa por UUID |
| `PATCH` | `/:id` | `admin` | Actualiza una empresa |
| `DELETE` | `/:id` | `admin` | Elimina una empresa |

Todos los parámetros UUID usan `ParseUUIDPipe`.

### DTO de entrada `CreateEmpresaDto`

| Campo | Tipo | Validación |
|---|---|---|
| `nombre` | `string` | `@IsString` `@IsNotEmpty` |
| `nit` | `string` | `@IsString` `@IsNotEmpty` |
| `direccion` | `string` | `@IsString` `@IsNotEmpty` |
| `telefono` | `string` | `@IsString` `@IsNotEmpty` |
| `correo` | `string` | `@IsEmail` `@IsNotEmpty` |
| `municipio` | `string` | `@IsString` `@IsNotEmpty` |
| `sector` | `string` | `@IsString` `@IsNotEmpty` |
| `estado` | `string` | `@IsString` `@IsOptional` |

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| Autenticación | `RlsGuard` global |
| Autorización | Mutaciones solo para `admin`; lectura para todos los roles |
| Multi-tenant | Tenant filter en todas las operaciones de repositorio |
| Token JWT | El adapter obtiene el token via `RequestContextService.getRawToken()` — no se pasa como parámetro |
| Validación de correo | `@IsEmail()` garantiza formato válido |
| NIT único | `@Column('text', { unique: true })` evita duplicados globales |

---

## Correcciones aplicadas

| # | Problema | Fix |
|---|---|---|
| 1 | Service importaba DTOs de `infrastructure` | Creados `CreateEmpresaCommand` / `UpdateEmpresaCommand` en `application/dto/` |
| 2 | `nit` declarado como `@Column('int')` pero tipado como `string` en TypeScript — falla con NITs que contienen guiones | Cambiado a `@Column('text', { unique: true })` |
| 3 | `buscarMunicipio(id, token)` recibía el token como parámetro — rompe la abstracción del puerto | Puerto redefinido como `buscarMunicipio(id: string)` sin token; el adapter lo obtiene internamente |
| 4 | `getToken()` en el servicio devolvía `''` y nunca era usado | Método eliminado |
| 5 | `correo` sin validación de formato | Añadido `@IsEmail()` en el DTO |
| 6 | `MunicipioInfo` no estaba definida — puerto devolvía `any` | Creada interfaz `MunicipioInfo` en el puerto |
