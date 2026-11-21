# Prototipo: reglas de diseño y formato de `app.json`

No escribís HTML. Escribís **`app.json`** (datos + pantallas) y `publicar.mjs` lo arma con un motor probado: mobile-first, navegación inferior, formularios que guardan en el navegador, estados vacíos y accesibilidad ya resueltos. Mirá `app-ejemplo.json` (veterinaria) como modelo.

## Reglas que hacen que se vea pro
1. **Elegí `estilo` por rubro** (cada uno trae paleta, tipografía y bordes propios):
   - `fresco` → salud, veterinaria, odontología, farmacia, limpieza.
   - `clasico` → barbería, sastrería, estudio jurídico, vinoteca, joyería.
   - `calle` → comida, food truck, delivery, cafetería, ferretería, eventos.
   - `sereno` → estética, spa, psicología, yoga, bienestar.
   - `profesional` → servicios B2B, inmobiliaria, contadores, logística, educación.
   Si el cliente nombró sus colores, sumá `"tema": {"primario": "#hex", "acento": "#hex"}` (primario oscuro: con texto blanco encima tiene que leerse).
2. **Datos realistas de LATAM**: nombres y apellidos comunes (Carla Gómez, Julián Ríos), direcciones y precios locales en la `moneda` del negocio (ARS, MXN, COP, CRC, CLP, PEN, USD…). Nunca lorem ipsum ni "Producto 1". 3–6 elementos por colección.
3. **Fechas relativas** para que la demo siempre se vea al día: `"fecha": "+1"` = mañana, `"-7"` = hace una semana, `"hoy"`. Mostralas con `{fecha|fecha}` → "Hoy", "Mañana", "Jue, 26 nov".
4. **Imágenes = emojis** (🐶 💈 🍔 🧾). Uno por elemento en el campo `imagen`, y uno en `logo`.
5. **3–4 pestañas** (`"nav": true`), máximo 5. La primera es el inicio: `hero` con saludo + acción principal, después `accesos` o `stats`, después una `lista` corta con `verTodo`.
6. **Prototipá la opción Recomendada completa** y nada más. Lo que no hace falta mostrar navegando (pagos reales, integraciones) va como `aviso` o como ítem de `perfil` sin `ir` ("Esto se activa en la versión final").
7. **Si hay dos tipos de usuario** (cliente y dueño), la última pestaña es la vista del dueño (ej. "Panel") con `stats` y `barras`.
8. Textos cortos, en español neutro y en segunda persona: "Sacar turno", "Reservar", "Ver pedido". Botones que dicen exactamente qué hacen.

## Estructura

```json
{
  "nombre": "Nombre de la app", "descripcion": "Una frase.", "logo": "🐾",
  "estilo": "fresco", "moneda": "ARS", "notificaciones": true,
  "inicio": "inicio",
  "pantallaCarrito": "pedido",
  "colecciones": { "turnos": [ { "id": "t1", "...": "..." } ] },
  "pantallas": [ { "id": "inicio", "titulo": "Inicio", "nav": true, "icono": "inicio", "bloques": [ ... ] } ]
}
```

**Pantalla**: `id` (minúsculas-con-guiones), `titulo` (acepta `{campo}` si es de detalle), `nav` (pestaña), `icono`, `etiqueta` (texto corto de la pestaña), `de` (colección: pantalla de detalle de un elemento), `tab` (qué pestaña queda marcada en sub-pantallas), `fab` `{texto, ir}` (botón flotante), `bloques`.

**Navegación**: `"ir": "pantalla"` o `"ir": "pantalla/idElemento"`. Una `lista`/`grilla` con `"ir": "detalle"` abre la pantalla `detalle`, que debe tener `"de"` igual a la colección de la lista.

**Plantillas de texto**: `"{campo}"`, `"{precio|moneda}"`, `"{fecha|fecha}"`.

**Íconos** (`icono`): inicio, calendario, lista, usuario, usuarios, bolsa, carrito, ubicacion, campana, mas, buscar, reloj, estrella, corazon, grafico, ajustes, check, telefono, mensaje, etiqueta, archivo, dinero, menu, tienda, historial — o un emoji.

## Bloques

| tipo | campos |
|---|---|
| `hero` | `titulo`, `texto`, `imagen` (emoji), `accion` `{texto, ir}` |
| `stats` | `titulo?`, `items` `[{valor, etiqueta}]`. `valor`: texto, `"#turnos"` (cantidad), `"#turnos?estado=Pendiente"` (cantidad filtrada), `"$pedidos.total"` (suma en moneda) |
| `accesos` | `items` `[{texto, icono, ir?}]` (4 por fila; sin `ir` muestra "se activa en la versión final") |
| `lista` | `coleccion`, `titulo?`, `item` `{titulo, subtitulo?, detalle?, badge?, precio?, imagen?}`, `ir?`, `buscar?` (bool), `buscarTexto?`, `filtro?` (campo → chips), `orden?` (`"fecha"`, `"-fecha"`), `limite?`, `verTodo?`, `donde?` `{campo: "valor o {campoDelDetalle}"}`, `futuros?`/`pasados?` (campo fecha), `estilo?` (`filas` · `tarjetas` · `timeline`), `vacio?`, `vacioIr?`, `vacioAccion?` |
| `grilla` | catálogo 2 columnas: `coleccion`, `item` `{titulo, subtitulo?, precio, imagen}`, `carrito?` (bool: botón +, necesita `pantallaCarrito`), `filtro?`, `ir?`. Elementos con `"disponible": false` salen "Agotado" |
| `carrito` | pedido actual con cantidades y total + checkout: `coleccion` (dónde se guarda el pedido), `campos`, `enviar`, `exito`, `luego`, `extra?`, `vacioIr?`. Guarda `items` (texto) y `total` |
| `formulario` | `coleccion`, `campos`, `enviar`, `exito` (acepta `{campo}`), `luego`, `extra?` (valores fijos del nuevo elemento, ej. `{"estado":"Pendiente","imagen":"💈"}`) |
| `detalle` | en pantallas con `de`: `imagen`, `titulo`, `subtitulo`, `badge`, `campos` `[{campo, etiqueta, formato?}]`, `acciones` `[{texto, estilo? (secundario/peligro), cambiar? {campo: valor}, eliminar?, ir?, exito?, whatsapp? (texto), numero?}]` |
| `texto` | `titulo?`, `texto` |
| `aviso` | `texto`, `tono` (`info` · `exito` · `alerta`), `icono?` |
| `mapa` | `titulo?`, `lugar`, `direccion`, `horario?`, `texto?` (botón "Cómo llegar" a Google Maps) |
| `barras` | `titulo`, `items` `[{etiqueta, valor}]` o `coleccion` + `agrupar` + `sumar?` (suma en moneda) |
| `perfil` | `nombre`, `detalle`, `imagen`, `items` `[{texto, icono, ir?}]` |
| `titulo` | `texto` (separador de sección) |
| `html` | `html` — último recurso, solo si ningún bloque sirve |

**Campos de formulario**: `{nombre, etiqueta, tipo, opciones?, opcionesDe? ("coleccion.campo"), placeholder?, requerido? (default true), valor?}`. Tipos: `texto`, `email`, `tel`, `numero`, `fecha`, `hora`, `textarea`, `select`, `chips` (elegir uno, ideal para 2–6 opciones), `dia` (tira de próximos días: `dias`, `excluir` [0=domingo]), `slots` (horarios: `opciones`, `ocupados`), `switch`.

Estados con color automático en `badge`: Confirmado/Listo/Entregado/Pagado → verde · Pendiente/En espera/Preparando → ámbar · Cancelado/Agotado/Vencido → rojo.

## Antes de terminar
`publicar.mjs` valida todo y, si algo falla, te dice exactamente qué pantalla o bloque corregir. Corregí solo eso y volvé a correrlo.
