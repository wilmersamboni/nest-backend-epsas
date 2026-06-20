# Módulo: Configuracion

## Propósito

Gestiona la configuración global del sistema. Actualmente almacena el **porcentaje mínimo de avance académico** que un aprendiz debe tener para que se le pueda crear una etapa práctica. La tabla tiene una única fila (`id = 1`) que se crea automáticamente con valores por defecto si no existe.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `configuracion.module.ts` | Declara el módulo, registra la entidad TypeORM y exporta `ConfiguracionService` para que otros módulos puedan inyectarlo |
| `configuracion.controller.ts` | Expone los endpoints REST (`GET` y `PATCH`) bajo el prefijo `/configuracion` |
| `configuracion.service.ts` | Lógica de negocio: lectura y escritura de la única fila de configuración |
| `configuracion.entity.ts` | Entidad TypeORM que mapea la tabla `configuracion_practica` |

---

## Entidad: `ConfiguracionPractica`

**Tabla**: `configuracion_practica`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `int` (PK) | Siempre vale `1`. Es una tabla de fila única. |
| `min_avance` | `decimal(5,2)` | Porcentaje mínimo de avance académico requerido. Default: `70`. |

---

## Servicio: `ConfiguracionService`

### `getConfig(): Promise<{ minAvance: number }>`

Devuelve la configuración global. Si la fila con `id = 1` no existe en la base de datos, la crea automáticamente con `min_avance = 70` antes de retornarla. El valor `decimal` de la BD se convierte a `number` con `Number()` para evitar que TypeORM lo retorne como string.

**Retorna:**
```json
{ "minAvance": 70 }
```

### `updateConfig(minAvance: number): Promise<{ minAvance: number }>`

Actualiza el campo `min_avance`. Si la fila existe usa `QueryBuilder` con `UPDATE`; si no existe la inserta directamente. Retorna el nuevo valor confirmado.

**Retorna:**
```json
{ "minAvance": 85 }
```

---

## Controlador: `ConfiguracionController`

**Prefijo**: `/api2/configuracion`

> Ningún endpoint tiene decorador `@Roles()`, por lo que el **RLS Guard global** solo exige que el request tenga un usuario autenticado (token válido). No se restringe por rol específico.

### `GET /api2/configuracion`

Obtiene la configuración actual.

**Respuesta exitosa (`200`)**:
```json
{
  "minAvance": 70
}
```

---

### `PATCH /api2/configuracion`

Actualiza el porcentaje mínimo de avance.

**Body**:
```json
{
  "minAvance": 85
}
```

El valor se parsea con `ParseFloatPipe`, por lo que se acepta tanto entero como decimal (`"minAvance": 85.5`).

**Respuesta exitosa (`200`)**:
```json
{
  "minAvance": 85
}
```

---

## Dependencias

### Internas (módulos que consumen este módulo)

| Módulo consumidor | Cómo lo usa |
|---|---|
| `EtapaPracticaModule` | Importa `ConfiguracionModule` e inyecta `ConfiguracionService` en `EtapaPracticaService` para validar el avance del aprendiz al crear una nueva etapa práctica |

### Externas

Ninguna. Este módulo solo depende de TypeORM y de la base de datos PostgreSQL local.

---

## Flujo de validación en `EtapaPracticaService`

Cuando se crea una etapa práctica y el DTO incluye el campo `avanceMatricula`, el servicio llama a `configuracionService.getConfig()` y compara:

```
si avanceMatricula < config.minAvance
  → lanza BadRequestException:
    "El aprendiz no cumple el avance mínimo requerido (70%). Avance actual: 65%"
```

Esto permite que el administrador ajuste el umbral sin necesidad de modificar código.

---

## Notas de diseño

- **Fila única**: El patrón de `id = 1` es intencional. No está diseñado para multi-tenancy (no lleva `centroId`). La configuración es global a toda la instancia del sistema.
- **Auto-inicialización**: `getConfig()` es idempotente; siempre retorna un valor válido aunque la tabla esté vacía.
- **Sin caché**: Este módulo no usa `AppCacheService` porque los cambios de configuración son infrecuentes y críticos — es preferible leer siempre desde la BD para garantizar que el valor más reciente se aplique de inmediato.
