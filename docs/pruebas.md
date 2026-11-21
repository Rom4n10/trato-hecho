# Pruebas

## Automáticas

`npm test` → **44/44** (config, transcripción, cotización, prototipo, propuesta, publicación local, QR).

## Pipeline de scripts (sin modelo)

Medido en Windows 11, Node 22, con los archivos que escribe el modelo ya listos:

| Caso | `quote.mjs` | `publicar.mjs --sin-deploy` | Pantallas | Recomendada |
|---|---|---|---|---|
| Veterinaria Patitas (ARS 18.000/h) | 0,3 s | 1,0 s | 8 | $ 1.240.000 · 3 semanas |
| Barbería Don Ramiro (ARS 15.000/h) | 0,3 s | 1,0 s | 7 | $ 1.160.000 · 3 semanas |
| Food truck El Fogón (ARS 15.000/h) | 0,3 s | 1,0 s | 5 | $ 915.000 · 3 semanas |

## Revisión manual en navegador

- Prototipos en 375 px y escritorio: navegación, formularios (turno, mascota, lista de espera), carrito completo (agregar → pedido → confirmar → aparece en cocina), filtros, búsqueda, cambio de estado, mapa. Sin errores de consola.
- Propuesta en 375 px y 1280 px: 3 opciones, recomendada destacada, links `wa.me` con texto prellenado.
- QR: 5 casos (URL corta, URL larga, IP local, texto con tildes y emoji, 300 caracteres) decodificados OK con jsQR.

## Pendiente de medir

- [ ] Transcripción real con Groq de los 3 audios (falta la clave).
- [ ] `/vozapp:crear` de punta a punta con el modelo y tiempo total (< 5 min objetivo).
- [ ] Deploy real a Vercel y apertura desde el celular escaneando el QR.
- [ ] Audios reales grabados por WhatsApp (con muletillas y ruido).
- [ ] Instalación desde GitHub en una carpeta limpia.
