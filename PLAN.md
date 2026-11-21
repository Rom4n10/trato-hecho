# Trato Hecho — Plan de ejecución Track 01 (sábado 21/11)

> **Del audio de WhatsApp del cliente a la propuesta aceptada, en 5 minutos.**
> Plugin de Claude Code: le pasás el audio del cliente y te devuelve brief, cotización con 3 opciones, prototipo publicado con link + QR y la propuesta lista para mandar por WhatsApp.

Horarios en **hora Costa Rica (UTC−6)**. Argentina = CR + 3 h.
Objetivo del día: **Track 01 entregable el sábado a las 21:00 CR.** El domingo es para Track 02.

---

## 0. Qué es el producto (no negociable)

**Usuario:** freelancers y agencias chicas de LATAM que venden desarrollo.
**Dolor:** el cliente pide todo por audio de WhatsApp. Pasar de ese audio a una propuesta lleva días (escuchar, entender, estimar, armar algo para mostrar) y en ese tiempo el cliente se enfría o se va con otro.
**Promesa:** un comando → en < 5 min tenés todo para mandarle al cliente.

**Comando:** `/trato:crear <ruta-al-audio>`

**Qué genera** (en `trato-out/<slug>/`):
| Archivo | Qué es |
|---|---|
| `transcripcion.md` | Lo que dijo el cliente, limpio |
| `brief.md` | Problema, usuarios, funcionalidades MVP, pantallas, **preguntas abiertas para el cliente** |
| `cotizacion.json` | Funcionalidades con horas; 3 opciones (Esencial / Recomendada / Completa) calculadas por script, no por el modelo |
| `site/index.html` | **Prototipo navegable**, mobile-first, datos de ejemplo, un solo archivo |
| `site/propuesta/index.html` | Página de propuesta para el cliente: resumen, link al prototipo, 3 opciones con precio, botón **"Acepto por WhatsApp"** |
| `mensaje-whatsapp.txt` | Mensaje listo para pegarle al cliente con los dos links |

Al final imprime en la terminal: **link del prototipo, link de la propuesta y un QR**.

### Alcance
- **MVP (hoy sí o sí):** transcribir → brief → cotización → prototipo → propuesta → deploy en Vercel → links + QR. `/trato:setup` que verifica claves. README con instalación en 2 comandos. 3 audios de ejemplo.
- **Stretch (solo si a las 16:30 el MVP anda):** `--sin-deploy` (preview local), tono/branding del freelancer en la propuesta (logo, color), `/trato:iterar "cambios"` que ajusta el prototipo con un segundo audio.
- **Fuera:** login, base de datos, backend real en el prototipo, pagos, editar desde web.

---

## 1. Antes de abrir Claude Code (07:00–07:45)

- [ ] **Groq API key** (transcripción, rápida y con capa gratis): console.groq.com → API Keys. Fallback: OpenAI API key.
- [ ] **Vercel token**: vercel.com → Settings → Tokens. Verificá `npx vercel --version`.
- [ ] Node 20+ y `ffmpeg` instalado (por si un audio necesita conversión).
- [ ] **Grabá 3 audios en tu celular por WhatsApp** (mandátelos a vos mismo y descargalos), hablando como cliente real, 30–60 s cada uno, con muletillas:
  1. Veterinaria: turnos, recordatorios de vacunas, historial de mascotas.
  2. Barbería: reservas por barbero, servicios con precio, lista de espera.
  3. Food truck: menú del día, pedidos para retirar, ubicación de hoy.
- [ ] Repo público en GitHub: `trato`. Copiá ahí los archivos de este kit (`CLAUDE.md`, `PLAN.md`, `.claude-plugin/`, `skills/`).
- [ ] Preguntá en el Discord/Discusiones de Dojo **cómo se publica en el Marketplace** (¿repo de GitHub? ¿precio lo fijás vos?). No bloquees por esto: seguí y ajustá después.
- [ ] `git init && git commit -m "Estado inicial: kit de plan"` → deja asentado el punto de partida (regla de trabajo durante el hackathon).

---

## 2. Fases con prompts para Claude Code

Abrí Claude Code en la raíz del repo. Pegá cada prompt tal cual. **No pases a la fase siguiente hasta cumplir el "Hecho cuando".** Commit al final de cada fase.

### F1 · Esqueleto del plugin + transcripción (07:45–09:30)

```
Leé CLAUDE.md y PLAN.md. Estamos en la fase F1.
1. Revisá .claude-plugin/plugin.json, .claude-plugin/marketplace.json y los dos SKILL.md (son borradores); corregí lo que no cumpla el formato de plugins de Claude Code.
2. Creá scripts/transcribe.mjs (Node 20, sin dependencias): recibe ruta de audio, usa GROQ_API_KEY (modelo whisper-large-v3-turbo, language "es") y si no hay, OPENAI_API_KEY. Si el formato no es aceptado (.opus), convertí con ffmpeg a .mp3 en un tmp. Escribe la transcripción en stdout. Errores claros en español.
3. Creá scripts/config.mjs: lee ~/.trato/config.json + variables de entorno (env gana). Campos: GROQ_API_KEY, OPENAI_API_KEY, VERCEL_TOKEN, nombre, tarifaHora, moneda, whatsapp.
4. Creá scripts/doctor.mjs: verifica Node, ffmpeg, claves y npx vercel; imprime un checklist ✅/❌ con cómo arreglar cada ❌.
5. Completá skills/setup/SKILL.md para que pregunte los datos que falten, escriba ~/.trato/config.json y corra doctor.mjs.
Probá transcribe.mjs con examples/audios/veterinaria.ogg y mostrame la salida.
```
**Hecho cuando:** `node scripts/transcribe.mjs examples/audios/veterinaria.ogg` devuelve el texto en < 10 s, y `claude --plugin-dir .` muestra `/trato:setup` y `/trato:crear`.

### F2 · Brief + cotización + propuesta (09:30–12:00)

```
Fase F2. Implementá los pasos 1–4 de skills/crear/SKILL.md:
1. Afiná skills/crear/references/brief.md (plantilla) y quote-rules.md (tabla de horas por tipo de funcionalidad: pantalla simple, formulario, listado con filtros, login, pagos, notificaciones, panel admin, integración externa; con rangos y multiplicador de complejidad).
2. Creá scripts/quote.mjs: recibe cotizacion.json (funcionalidades con horas y a qué opción pertenecen) + config (tarifaHora, moneda); calcula subtotales, total por opción (Esencial/Recomendada/Completa), plazo estimado en semanas (30 h productivas/semana) y valida que los números cuadren. El modelo NUNCA hace aritmética: solo propone horas.
3. Creá skills/crear/templates/propuesta.html: página de propuesta elegante, mobile-first, Tailwind por CDN, en español. Secciones: lo que entendimos, link grande al prototipo, 3 tarjetas de opciones (la Recomendada destacada), preguntas abiertas, validez 7 días, botón "Acepto por WhatsApp" con link wa.me y texto prellenado según la opción. Placeholders tipo {{...}} que llena un script.
4. Creá scripts/render-proposal.mjs que llena la plantilla con brief + cotización calculada.
Corré el flujo hasta acá con veterinaria.ogg y mostrame la propuesta generada.
```
**Hecho cuando:** sale `brief.md` con preguntas abiertas útiles, `cotizacion.json` con totales correctos y `site/propuesta/index.html` que se ve profesional en el celular.

### Almuerzo (12:00–12:45). No lo saltees.

### F3 · Prototipo + deploy + QR (12:45–15:00)

```
Fase F3. Pasos 5–7 de skills/crear/SKILL.md:
1. Creá skills/crear/references/design-rules.md: reglas para que el prototipo se vea pro (paleta según rubro, tipografía, espaciado, tarjetas, navegación inferior en mobile, estados vacíos, datos de ejemplo realistas en español con nombres y precios locales, nada de lorem ipsum, accesibilidad básica de contraste).
2. Creá skills/crear/templates/app-base.html: esqueleto de SPA en un solo archivo (Tailwind CDN + JS vanilla, router por hash, datos en un objeto JS, localStorage para que lo que el usuario cree persista). El skill lo usa como punto de partida para cada prototipo.
3. Creá scripts/deploy.mjs: publica trato-out/<slug>/site en Vercel con `npx vercel deploy --prod --yes --token` usando un nombre de proyecto trato-<slug>; devuelve la URL. Si falla, levanta preview local con `npx serve` y lo avisa. Después imprime QR en la terminal (usá `npx -y qrcode-terminal` o generá el QR sin dependencias).
4. Generá mensaje-whatsapp.txt al final.
Corré el flujo completo con barberia.ogg, medí el tiempo de cada paso y mostrámelo.
```
**Hecho cuando:** abrís el link desde tu celular escaneando el QR y el prototipo navega entre al menos 3 pantallas con datos creíbles.

### F4 · Robustez y velocidad (15:00–16:30)

```
Fase F4. Corré /trato:crear con los 3 audios de examples/audios. Para cada uno, anotá en docs/pruebas.md: tiempo total, tiempo por paso, problemas. Después:
- Bajá el tiempo total a menos de 5 minutos (recortá instrucciones redundantes del SKILL, pedí el prototipo de una sola vez, nada de pasos de verificación lentos).
- Manejo de errores: audio vacío o inaudible, audio en inglés, cliente que pide algo imposible (decirlo en preguntas abiertas), sin VERCEL_TOKEN (preview local), slug repetido.
- Revisá los 3 prototipos con ojo crítico de diseñador y ajustá design-rules.md donde se vean genéricos.
```
**Hecho cuando:** los 3 audios corren de punta a punta sin intervención y en < 5 min.

### F5 · Documentación e instalación (16:30–18:00) — vale 20% del puntaje

```
Fase F5. Dejá el repo listo para el Marketplace:
1. README.md en español: qué hace en una frase, GIF/captura arriba, instalación en 2 comandos (/plugin marketplace add <usuario>/trato y /plugin install trato@trato-hecho), /trato:setup, primer uso con un audio de ejemplo, qué genera, costos aproximados por corrida, FAQ (¿qué audios acepta?, ¿puedo cambiar mi tarifa?, ¿qué pasa sin Vercel?), privacidad (el audio solo va al proveedor de transcripción).
2. Corré `claude plugin validate .` y arreglá todo lo que reporte.
3. Probá la instalación desde cero como un usuario nuevo: marketplace add apuntando al repo de GitHub, install, setup, crear. Anotá cada fricción y eliminala.
4. CHANGELOG.md, LICENSE (MIT) y docs/como-se-construyo.md: qué hizo Claude Code y qué decidí yo (requisito de entrega).
```
**Hecho cuando:** alguien que nunca vio el repo lo instala y genera su primera propuesta en < 5 min siguiendo solo el README.

### F6 · Evidencia real (18:00–19:30) — esto es lo que te diferencia

- Mandá el link del repo a **3–5 builders** (Discord de Dojo, grupos de freelancers): "¿Me lo probás con un audio real de un cliente? Te lleva 5 min."
- Pediles una frase de feedback y permiso para citarla.
- Anotá: cuántos lo instalaron, tiempo que les tomó, qué dijeron. Esto va al pitch y a la entrega.
- Arreglá lo que rompan.

### F7 · Video de demo + entrega (19:30–21:00)

Ver secciones 4 y 5. A las 21:00 Track 01 queda **cerrado**. Lo que no esté, no entra.

---

## 3. Riesgos y planes B

| Riesgo | Plan B |
|---|---|
| Groq falla o no acepta el formato | OpenAI de fallback; conversión con ffmpeg |
| Vercel falla en vivo | Preview local + QR a la IP local, o deploy ya hecho de antes en el video |
| El prototipo sale genérico/feo | Más peso a `app-base.html` y `design-rules.md`; ejemplos concretos en las reglas |
| El flujo tarda > 5 min | Recortar el SKILL; prototipo en una sola escritura; brief más corto |
| Formato del Marketplace distinto | El plugin igual se instala desde GitHub; adaptar el empaquetado el domingo temprano |
| Te atrasás | Cortar en este orden: iterar → branding → `--sin-deploy`. **Nunca** cortar README ni video |

---

## 4. Guion del video (2:30 máx.)

1. **(0:00–0:20) Dolor.** Pantalla de WhatsApp con un audio de cliente. "Tu cliente te manda esto. Normalmente tardás 3 días en mandarle una propuesta. Para entonces ya habló con otro."
2. **(0:20–0:35) Un comando.** Arrastrás el audio a Claude Code: `/trato:crear audio.ogg`.
3. **(0:35–1:30) Magia, acelerada x4 con cronómetro visible.** Transcripción → brief con preguntas → cotización con 3 opciones → prototipo → deploy → QR.
4. **(1:30–2:00) Lo que ve el cliente.** Escaneás el QR con el celular: navegás el prototipo, abrís la propuesta, tocás "Acepto por WhatsApp" y se abre el chat con el mensaje listo.
5. **(2:00–2:20) Prueba.** "Lo probaron X builders este fin de semana" + una cita. Costo por corrida.
6. **(2:20–2:30) Cierre.** "Trato Hecho. Del audio al sí del cliente, en 5 minutos. Instalalo con 2 comandos."

Grabá con cronómetro real en pantalla. Si podés, una toma sin cortes del flujo completo como respaldo.

## 5. Checklist de entrega

- [ ] Repo público con README, LICENSE y ejemplos
- [ ] `claude plugin validate .` sin errores
- [ ] Instalación probada desde GitHub en una máquina/carpeta limpia
- [ ] Video subido (YouTube no listado o Loom) y link probado en incógnito
- [ ] Link a un prototipo y una propuesta de ejemplo ya publicados
- [ ] Texto de entrega: problema, a quién le sirve, cómo se instala, precio sugerido, evidencia, cómo usaste AI coding (`docs/como-se-construyo.md`)
- [ ] Precio sugerido para el Marketplace (ej. US$19 pago único o US$9/mes). Argumento: "un solo cliente cerrado lo paga 50 veces"

## 6. Pitch en una línea por criterio

| Criterio | Qué decís |
|---|---|
| Utilidad real (30%) | "Convierte días de idas y vueltas en 5 minutos, en el canal que usan los clientes de LATAM: el audio de WhatsApp." |
| Potencial de venta (25%) | "Todo freelancer y agencia lo necesita; se paga con el primer cliente que cerrás." |
| Calidad técnica (25%) | "Transcripción + skill + scripts deterministas para los números + deploy automático. Probado con N audios reales." |
| Docs e instalación (20%) | "Dos comandos y un setup guiado que verifica todo." |
