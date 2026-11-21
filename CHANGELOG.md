# Changelog

## 0.1.1 — 2026-11-21

- `/trato:crear` informa el tiempo total real (antes el modelo lo estimaba).
- La transcripción ya no saltea frases al final del audio.
- El preview local no bloquea la carpeta del usuario en Windows.

## 0.1.0 — 2026-11-21

Primera versión (Dojo AI Hack, Track 01). El proyecto arrancó como "VozApp" y se renombró a Trato Hecho.

- `/trato:crear <audio>`: transcripción, brief, cotización con 3 opciones, prototipo navegable, propuesta con "Acepto por WhatsApp", publicación en Vercel, QR y mensaje listo para enviar.
- `/trato:crear ejemplo <rubro>`: prueba con audios de ejemplo incluidos.
- `/trato:setup`: configuración guiada y diagnóstico.
- Transcripción con Groq (Whisper large v3 turbo) y OpenAI de respaldo; `.opus` sin conversión, ffmpeg para formatos raros; detección de audios vacíos.
- Cotización determinista (`quote.mjs`) con tabla de horas, complejidad y tarifa del freelancer.
- Motor de prototipos declarativo con 5 estilos por rubro, carrito, formularios, filtros, búsqueda, mapa y reportes.
- Preview local en la red cuando no hay Vercel; generador de QR propio.
- 48 tests con `node:test`, sin dependencias.
- Corrida completa medida: 2 min 7 s del audio a los links; el tiempo real se imprime al final.
