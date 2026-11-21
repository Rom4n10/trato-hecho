---
name: crear
description: Convierte el audio de WhatsApp (o el texto) de un cliente que pide un software en brief, cotización con 3 opciones, prototipo navegable publicado y propuesta lista para mandar por WhatsApp. Usar cuando el usuario pasa un audio de cliente (.ogg, .opus, .m4a, .mp3, .wav, .txt) o pide armar una propuesta, cotización o prototipo a partir de lo que pidió un cliente.
argument-hint: <ruta-al-audio> [--sin-deploy]
allowed-tools: Bash(node:*), Read, Write, Edit
---

# VozApp · crear

Entrada: `$ARGUMENTS` — ruta a un audio o .txt, y opcionalmente `--sin-deploy`. Si no hay ruta, pedila en una línea y pará.

**Objetivo: todo en menos de 5 minutos.** No pidas confirmaciones. No expliques lo que vas a hacer. Una línea de avance por paso ("1/4 Transcribiendo…"). Hacé en paralelo todo lo que se pueda dentro de un mismo mensaje.

Scripts en `${CLAUDE_PLUGIN_ROOT}/scripts/`, referencias en `${CLAUDE_PLUGIN_ROOT}/skills/crear/references/`. Si `${CLAUDE_PLUGIN_ROOT}` no está definida, la raíz del plugin es la carpeta dos niveles arriba del directorio de este skill.

## 1/4 · Escuchar (un solo mensaje, en paralelo)
- Bash: `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" --quiet && node "${CLAUDE_PLUGIN_ROOT}/scripts/transcribe.mjs" "<audio>"`
- Read (las 4 en paralelo): `${CLAUDE_PLUGIN_ROOT}/skills/crear/references/` → `brief.md`, `quote-rules.md`, `design-rules.md`, `app-ejemplo.json`

Si doctor falla: mostrá qué falta, sugerí `/vozapp:setup` y pará. Si la transcripción falla, mostrá el error tal cual y pará. Anotá los segundos de audio que informa (stderr).

## 2/4 · Entender y cotizar
Elegí un slug corto: rubro + nombre (`veterinaria-patitas`). Carpeta: `vozapp-out/<slug>/` en el directorio actual; si ya existe, agregá `-2`, `-3`.
En **un solo mensaje**, escribí en paralelo:
- `transcripcion.md` — el texto limpio: sin muletillas ni repeticiones, sin cambiar el sentido.
- `brief.md` — según `brief.md` de referencia. 3–5 preguntas abiertas que cambien precio o alcance.
- `cotizacion.json` — según `quote-rules.md`. Agregá `"duracionAudio": <segundos>`. Solo tipo/complejidad/opción: **nunca horas ni precios calculados por vos**.
- `app.json` — según `design-rules.md`: el prototipo de la opción Recomendada.

Después: `node "${CLAUDE_PLUGIN_ROOT}/scripts/quote.mjs" vozapp-out/<slug>`. Si reporta problemas, corregí con Edit solo lo indicado y repetí.

## 3/4 · Publicar
`node "${CLAUDE_PLUGIN_ROOT}/scripts/publicar.mjs" vozapp-out/<slug>` (agregá `--sin-deploy` si vino en los argumentos). Arma prototipo y propuesta, publica en Vercel (o preview local si no se puede), genera QR y `mensaje-whatsapp.txt`.
Si reporta errores de `app.json`, corregí con Edit solo eso y repetí.

## 4/4 · Cierre
Respondé solo esto, sin preámbulo:
- **Prototipo:** link · **Propuesta:** link
- **Recomendada:** precio · semanas (tal cual lo imprimió el script)
- Tiempo total
- Las preguntas abiertas más importantes (máx. 3, una línea cada una)
- El mensaje de `mensaje-whatsapp.txt` en un bloque de código, listo para copiar.
- Una línea: "El QR está arriba en la salida de publicar y en `vozapp-out/<slug>/qr.svg`."

## Casos especiales
- **Audio en otro idioma:** igual todo en español; mencionalo en una línea.
- **Pedido imposible o muy vago** (ej. "un Uber pero para todo"): cotizá un MVP razonable y explicalo en "Riesgos" del brief y en las preguntas abiertas.
- **No es un pedido de software:** decilo y pará.
