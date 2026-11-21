# Changelog

## 0.1.0 — 2026-11-21

Primera versión (Dojo AI Hack, Track 01).

- `/vozapp:crear <audio>`: transcripción, brief, cotización con 3 opciones, prototipo navegable, propuesta con "Acepto por WhatsApp", publicación en Vercel, QR y mensaje listo para enviar.
- `/vozapp:crear ejemplo <rubro>`: prueba con audios de ejemplo incluidos.
- `/vozapp:setup`: configuración guiada y diagnóstico.
- Transcripción con Groq (Whisper large v3 turbo) y OpenAI de respaldo; `.opus` sin conversión, ffmpeg para formatos raros; detección de audios vacíos.
- Cotización determinista (`quote.mjs`) con tabla de horas, complejidad y tarifa del freelancer.
- Motor de prototipos declarativo con 5 estilos por rubro, carrito, formularios, filtros, búsqueda, mapa y reportes.
- Preview local en la red cuando no hay Vercel; generador de QR propio.
- 44 tests con `node:test`, sin dependencias.
