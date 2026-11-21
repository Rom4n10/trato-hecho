# Pruebas

## Automáticas

`npm test` → **46/46** (config, transcripción, cotización, prototipo, propuesta, publicación local, QR).

## Transcripción real (Groq, whisper-large-v3-turbo)

| Audio | Duración | Tiempo | Resultado |
|---|---|---|---|
| veterinaria.ogg | 36 s | 0,9 s | Completo |
| barberia.ogg | 31 s | 0,8 s | Completo |
| foodtruck.ogg | 27 s | 1,1 s | Completo ("food truck" sale raro porque la voz sintética lo pronuncia mal) |

**Bug encontrado y corregido:** con el parámetro `prompt`, el modelo turbo colapsaba la segunda ventana de 30 s y en veterinaria se perdía el pedido de "pagar la consulta por adelantado". Se comparó 5 variantes (con/sin prompt, turbo/large-v3, idioma forzado) y la causa era el prompt. Se quitó y se agregó un reintento con `whisper-large-v3` si un segmento largo viene casi vacío.

## Publicación real en Vercel

| Ejemplo | Deploy | Links |
|---|---|---|
| Veterinaria Patitas | 10,0 s | https://trato-veterinaria-patitas.vercel.app/ |
| Barbería Don Ramiro | 11,2 s | https://trato-barberia-don-ramiro.vercel.app/ |
| Food truck El Fogón | 10,6 s | https://trato-foodtruck-el-fogon.vercel.app/ |

Los links son públicos (HTTP 200, sin protección de Vercel).

## Instalación desde GitHub

```
claude plugin marketplace add Rom4n10/trato-hecho
claude plugin install trato@trato-hecho
```

Instala `trato` 0.1.0 con los skills `crear` y `setup`. Costo fijo: ~300 tokens por sesión.

## Pipeline de scripts (sin modelo)

| Caso | `quote.mjs` | `publicar.mjs --sin-deploy` | Pantallas | Recomendada |
|---|---|---|---|---|
| Veterinaria Patitas (ARS 18.000/h) | 0,3 s | 1,0 s | 8 | $ 1.240.000 · 3 semanas |
| Barbería Don Ramiro (ARS 15.000/h) | 0,3 s | 1,0 s | 7 | $ 1.160.000 · 3 semanas |
| Food truck El Fogón (ARS 15.000/h) | 0,3 s | 1,0 s | 5 | $ 915.000 · 3 semanas |

## Revisión manual en navegador

- Prototipos en 375 px y escritorio: navegación, formularios (turno, mascota, lista de espera), carrito completo (agregar → pedido → confirmar → aparece en cocina), filtros, búsqueda, cambio de estado, mapa. Sin errores de consola.
- Propuesta en 375 px y 1280 px: 3 opciones, recomendada destacada, links `wa.me` con texto prellenado.
- QR: 5 casos (URL corta, URL larga, IP local, texto con tildes y emoji, 300 caracteres) decodificados OK con jsQR.

## Corrida completa con Claude

`/trato:crear examples/audios/veterinaria.ogg --sin-deploy` desde una carpeta vacía, con el plugin cargado como lo instala un usuario (Claude Sonnet 5, modo no interactivo):

| Medida | Resultado |
|---|---|
| Tiempo total, del audio a los links | **2 min 7 s** (+ ~10 s si publica en Vercel) |
| Pasos del modelo | 13, sin errores ni reintentos |
| `cotizacion.json` y `app.json` | Válidos al primer intento |
| Prototipo | 8 pantallas, 4 pestañas (incluye panel del dueño), sin errores de consola |
| Recomendada | $ 975.000 · 3 semanas (ARS 15.000/h) |
| Costo equivalente en API | US$ 0,80 (en planes Pro/Max entra en el uso del plan) |

Hallazgo: el modelo estimaba el tiempo total a ojo ("~4 min"). Ahora `doctor.mjs --inicio` marca el comienzo y `publicar.mjs` imprime el tiempo real.

## Pendiente

- [ ] Audios reales grabados por WhatsApp o Telegram (con muletillas y ruido).
- [ ] Pruebas con 3–5 builders y sus comentarios.
