# Reglas de cotización

**Vos no hacés cuentas.** Elegís `tipo`, `complejidad` y `cantidad` de cada funcionalidad; `scripts/quote.mjs` saca horas, precios y plazos con `tabla-horas.json` y la tarifa del freelancer.

## Tipos (horas base, complejidad media)

| tipo | qué es | h |
|---|---|---|
| `pantalla` | pantalla simple o informativa | 4 |
| `formulario` | formulario con validaciones | 6 |
| `listado` | listado con búsqueda y filtros | 8 |
| `detalle` | ficha o vista de detalle | 4 |
| `catalogo` | catálogo o menú con carrito | 12 |
| `reservas` | agenda y reservas con disponibilidad | 16 |
| `login` | registro e inicio de sesión | 10 |
| `roles` | roles y permisos | 8 |
| `pagos` | pagos en línea (Mercado Pago, Stripe) | 16 |
| `notificaciones` | recordatorios por WhatsApp/email/push | 10 |
| `panel-admin` | panel para que el dueño administre | 16 |
| `reportes` | reportes y estadísticas | 10 |
| `integracion` | integración con sistema externo | 12 |
| `mapa` | mapa o ubicación | 6 |
| `archivos` | carga de imágenes o archivos | 6 |
| `lista-espera` | lista de espera con aviso automático | 10 |
| `chat` | chat interno | 16 |

**Complejidad:** `baja` ×0,7 (casi sin reglas) · `media` ×1 · `alta` ×1,5 (muchas reglas, casos borde, varios roles).
**Cantidad:** cuántas unidades iguales (ej. 3 pantallas informativas → `"tipo":"pantalla","cantidad":3`). Por defecto 1.
El script suma solo: 10 h fijas de configuración y publicación + 15 % de pruebas y ajustes.

## Cómo repartir en 3 opciones (acumulativas)
- **esencial**: lo mínimo para que el negocio use la app desde el día 1 y resuelva el dolor principal del audio. 3–5 funcionalidades.
- **recomendada**: esencial + lo que el cliente pidió explícitamente. Es la que se prototipa y la que conviene vender.
- **completa**: recomendada + lo que haría crecer el negocio y el cliente no pidió (pagos, reportes, roles, integraciones).

Cada funcionalidad va **una sola vez**, en la opción más baja que la incluye. Siempre va `login` o `panel-admin` si hay datos del negocio que alguien tiene que cargar.

## Override (solo si de verdad hace falta)
Si algo no entra en ningún tipo, usá el más parecido y agregá `"horas": N, "motivo": "por qué"`. Nunca sin `motivo`.

## Formato de `cotizacion.json`

```json
{
  "proyecto": "Patitas App",
  "cliente": "Veterinaria Patitas",
  "rubro": "veterinaria",
  "resumen": "Una app para que los clientes saquen turno solos, reciban recordatorios de vacunas y el equipo vea el historial de cada mascota.",
  "entendimos": [
    "Hoy los turnos se manejan por WhatsApp y se pierden mensajes.",
    "Los clientes se olvidan de las vacunas de sus mascotas.",
    "Querés ver el historial clínico de cada mascota en un solo lugar."
  ],
  "preguntas": [
    "¿Cuántos veterinarios atienden y con qué horarios?",
    "¿Qué medio de pago usan hoy (Mercado Pago, transferencia)?",
    "¿El historial lo cargan solo ustedes o también el cliente?"
  ],
  "funcionalidades": [
    { "id": "turnos", "nombre": "Reserva de turnos online", "descripcion": "El cliente elige día y horario libre.", "tipo": "reservas", "complejidad": "media", "opcion": "esencial" },
    { "id": "mascotas", "nombre": "Ficha de cada mascota", "descripcion": "Datos, foto y dueño.", "tipo": "formulario", "complejidad": "baja", "opcion": "esencial" },
    { "id": "recordatorios", "nombre": "Recordatorio de vacunas por WhatsApp", "tipo": "notificaciones", "complejidad": "media", "opcion": "recomendada" },
    { "id": "pagos", "nombre": "Pago de la consulta por adelantado", "tipo": "pagos", "complejidad": "media", "opcion": "completa" }
  ]
}
```
Campos obligatorios: `proyecto`, `resumen`, `entendimos` (2–4), `preguntas` (3–5), `funcionalidades` (con `id`, `nombre`, `tipo`, `complejidad`, `opcion`). `cliente` y `descripcion` son opcionales. No escribas `calculo`: lo agrega el script.
