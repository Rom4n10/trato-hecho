# Cómo se construyó Trato Hecho

Trato Hecho se construyó en un día con Claude Code. Este documento separa lo que decidió la persona de lo que hizo la IA.

## Lo que decidió el humano

- **El producto y el usuario:** freelancers y agencias chicas de LATAM; el dolor es el audio de WhatsApp que tarda días en convertirse en propuesta.
- **La promesa y el alcance:** un comando, menos de 5 minutos; qué entra en el MVP, qué es stretch y qué queda afuera (login, base de datos, pagos reales).
- **El plan por fases** (`PLAN.md`) y las reglas del proyecto (`CLAUDE.md`): scripts sin dependencias, español neutro, claves fuera del repo, errores con cómo arreglarlos.
- **La regla clave de confianza:** el modelo nunca hace la aritmética de la cotización.
- **El nombre:** Trato Hecho (el proyecto empezó como VozApp).
- **El stack de servicios:** Groq para transcribir (con OpenAI de respaldo) y Vercel para publicar.
- **El guion del video y el pitch.**

## Lo que hizo Claude Code

### F1 · Esqueleto y transcripción
- Corrigió los manifiestos del plugin y del marketplace hasta pasar `claude plugin validate .` sin avisos.
- Escribió `config.mjs` (archivo + variables de entorno, el entorno gana), `doctor.mjs` (checklist con cómo arreglar cada problema) y `transcribe.mjs`.
- Decidió subir los `.opus` de WhatsApp como `.ogg` (mismo contenedor) en vez de convertirlos: un paso menos y sin depender de ffmpeg.
- Agregó detección de "audios vacíos": Whisper inventa frases como "Gracias por ver el video" cuando no hay voz.
- Generó 3 audios de prueba con la voz en español de Windows (`examples/generar-audios.ps1`), convertidos a Opus como los de WhatsApp.

### F2 · Cotización y propuesta
- Propuso que el modelo elija `tipo` + `complejidad` de una tabla en vez de escribir horas: así ni siquiera multiplica. `quote.mjs` calcula todo, valida que los totales cuadren y redondea precios a 3 cifras.
- Diseñó la propuesta: la pieza central es una burbuja de nota de voz con el resumen como "transcripción", que conecta con el origen del pedido. Barra fija con la opción recomendada en el celular.

### F3 · Prototipo, publicación y QR
- **Cambio de enfoque más importante:** en lugar de que el modelo escriba cada prototipo en HTML, propuso un motor declarativo. El modelo escribe `app.json` (pantallas y datos) y el motor arma la app. Resultado: ~5 veces menos texto generado (más rápido), diseño consistente y un validador que dice exactamente qué corregir.
- 5 estilos por rubro con paleta y tipografía propias; fechas relativas (`"+1"` = mañana) para que la demo nunca se vea vieja.
- `deploy.mjs`: publica en Vercel con un nombre de proyecto por cliente y, si falla, levanta un preview en la red local eligiendo la IP correcta (descartó la del adaptador de VirtualBox que había tomado primero).
- Generador de QR propio sin dependencias, verificado decodificando 5 casos con jsQR en el navegador.

### Prueba real y correcciones
- Comparó 5 variantes de Whisper para encontrar por qué se perdía una frase del audio: el parámetro `prompt` con el modelo turbo. Lo quitó y agregó un reintento automático.
- Corrió `/trato:crear` de punta a punta con Claude desde una carpeta vacía: 2 min 7 s, sin errores. Detectó que el modelo inventaba el tiempo total y lo reemplazó por una medición real.
- Encontró que el preview local bloqueaba la carpeta del usuario en Windows y lo corrigió.

### Calidad
- 48 tests con `node:test` escritos antes de cada script (TDD).
- Revisión visual en el navegador integrado de los 3 prototipos y la propuesta, en celular y escritorio; arregló bordes de formularios, textos apretados en listas y montos que desbordaban.

## Decisiones que tomó la IA y se pueden revisar

| Decisión | Por qué | Qué cuesta si está mal |
|---|---|---|
| Prototipo declarativo (`app.json` + motor) en vez de HTML libre | Velocidad (< 5 min) y que nunca salga roto | Prototipos menos personalizables (hay un bloque `html` de escape) |
| CSS propio en vez de Tailwind por CDN | Sin avisos de consola ni parpadeos, control total del diseño | No se pueden usar clases de Tailwind |
| Transcripción con detección de idioma en vez de forzar español | Soportar audios en inglés | Un poco menos de precisión en audios muy cortos |
| El contenido de la propuesta sale de `cotizacion.json`, no de `brief.md` | Parsear markdown es frágil | Las preguntas abiertas se escriben en dos lugares |
| `mensaje-whatsapp.txt` lo genera un script | Determinista y un paso menos del modelo | Mensaje menos personalizado |
