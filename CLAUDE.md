# VozApp — contexto para Claude Code

Plugin de Claude Code que convierte el audio de WhatsApp de un cliente en: brief, cotización con 3 opciones, prototipo publicado y propuesta lista para enviar. Proyecto de hackathon (Dojo AI Hack, Track 01 "Build for Builders"), entrega sábado 21/11 21:00 hora Costa Rica. El plan por fases está en PLAN.md: trabajá solo en la fase que te indiquen.

## Estructura
- `.claude-plugin/plugin.json` — manifiesto. `.claude-plugin/marketplace.json` — el repo es su propio marketplace.
- `skills/crear/` — skill principal (`/vozapp:crear <audio>`). `references/` reglas (brief, cotización, diseño), `tabla-horas.json`, `app-ejemplo.json`; `templates/` motor del prototipo (`app-base.html`) y propuesta.
- `skills/setup/` — configuración guiada (`/vozapp:setup`).
- `scripts/` — Node 20 ESM (`.mjs`), sin dependencias. Desde los skills se llaman con `node "${CLAUDE_PLUGIN_ROOT}/scripts/<x>.mjs"`.
  - `transcribe` → `quote` (cuentas) → `publicar` (= `build-prototype` + `render-proposal` + `deploy` + `qr` + mensaje).
- `tests/` — `npm test` (node:test). `examples/audios/` y `examples/textos/` — casos de prueba. `vozapp-out/` — salidas (en .gitignore).

## Reglas
- Todo lo que ve el usuario final (mensajes, README, propuesta, prototipo) va en **español neutro latinoamericano**.
- Scripts **sin dependencias** salvo justificación fuerte. Usar `fetch`, `FormData` y `Blob` nativos de Node 20.
- **El modelo nunca hace aritmética de la cotización**: propone horas; `scripts/quote.mjs` calcula totales.
- Los prototipos son **un solo HTML**: el modelo escribe `app.json` y `build-prototype.mjs` lo inyecta en el motor `templates/app-base.html` (CSS propio + JS vanilla), mobile-first, con datos de ejemplo realistas. Sin backend. Para una capacidad nueva del prototipo, agregá un bloque al motor y documentalo en `references/design-rules.md`.
- Nunca imprimir ni commitear claves. Config en `~/.vozapp/config.json` o variables de entorno.
- Errores siempre con mensaje claro en español y cómo arreglarlo.
- Objetivo de rendimiento: flujo completo < 5 minutos.
- Prioridad ante dudas: que funcione de punta a punta > que se vea bien > features nuevas.

## Comandos útiles
- Probar el plugin localmente: `claude --plugin-dir .`
- Validar: `claude plugin validate .`
- Transcribir a mano: `node scripts/transcribe.mjs examples/audios/veterinaria.ogg`
- Diagnóstico: `node scripts/doctor.mjs`

## Al terminar cada fase
1. Probar con un audio real de `examples/audios/`.
2. Resumir en 3 líneas qué se hizo y qué falta.
3. Agregar una entrada a `docs/como-se-construyo.md` (qué hizo la IA, qué decidió el humano).
4. Proponer el mensaje de commit.
