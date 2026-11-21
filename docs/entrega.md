# Entrega — Track 01 "Build for Builders"

Lo que está entre corchetes `[ ]` lo completás vos con datos reales antes de entregar.

## Texto de entrega

**Trato Hecho** — del audio de WhatsApp del cliente al "¡trato hecho!", en menos de 5 minutos.

**El problema.** En LATAM los clientes piden software por audio de WhatsApp. Pasar de ese audio a una propuesta lleva días: escucharlo, entenderlo, estimar, armar algo para mostrar. Mientras tanto, el cliente se enfría o se va con otro.

**A quién le sirve.** Freelancers y agencias chicas que venden desarrollo a negocios locales: veterinarias, barberías, gastronomía, comercios.

**Qué hace.** Es un plugin de Claude Code. Con `/trato:crear audio.ogg` genera, en una sola corrida:
- la transcripción y un brief con las preguntas abiertas para el cliente;
- una cotización con 3 opciones (Esencial, Recomendada, Completa) calculada por un script con la tarifa del freelancer, no por la IA;
- un prototipo navegable con fotos reales y datos de ejemplo creíbles, publicado en Vercel con link y QR;
- una propuesta lista para mandar, con un botón "Acepto por WhatsApp" en cada opción;
- el mensaje para pegarle al cliente.

**Cómo se instala.**
```
/plugin marketplace add Rom4n10/trato-hecho
/plugin install trato@trato-hecho
/trato:setup
```

**Evidencia.**
- Corrida completa medida con Claude: 2 min 7 s del audio a los links, sin errores.
- 3 ejemplos publicados: [trato-veterinaria-patitas.vercel.app](https://trato-veterinaria-patitas.vercel.app/) · [trato-barberia-don-ramiro.vercel.app](https://trato-barberia-don-ramiro.vercel.app/) · [trato-foodtruck-el-fogon.vercel.app](https://trato-foodtruck-el-fogon.vercel.app/)
- 50 tests automáticos; transcripción real de 3 audios en ~1 s cada uno.
- [Lo probaron N builders. Cita: "…" — Nombre, rol]

**Precio sugerido.** US$ 19 pago único (o US$ 9/mes con actualizaciones). Un solo cliente cerrado lo paga más de 50 veces. Costo por propuesta para el freelancer: el uso de su plan de Claude (~US$ 0,80 equivalente en API), transcripción en la capa gratuita de Groq y publicación en la capa gratuita de Vercel.

**Cómo usamos AI coding.** Todo se construyó con Claude Code en un día; el detalle de qué decidió el humano y qué hizo la IA está en [docs/como-se-construyo.md](como-se-construyo.md). Decisiones técnicas clave: la IA elige qué funcionalidades van en cada opción pero nunca hace las cuentas; los prototipos se describen en un JSON y un motor probado los arma, así salen rápidos y nunca rotos.

**Lo que viene.** Puente con Telegram (reenviás el audio desde el celular y te vuelven los links), iterar el prototipo con un segundo audio del cliente, y una versión web sin instalar nada.

## Guion del video (2:30)

Grabá con un cronómetro visible. Conviene tener una toma sin cortes del flujo completo como respaldo.

| Tiempo | Qué se ve | Qué decís |
|---|---|---|
| 0:00–0:15 | WhatsApp con un audio de cliente de 40 s | "Tu cliente te manda esto. Armarle una propuesta te lleva días, y para entonces ya habló con otro." |
| 0:15–0:25 | Arrastrás el audio a Claude Code: `/trato:crear audio.ogg` | "Con Trato Hecho es un comando." |
| 0:25–1:15 | El flujo acelerado x4 con el cronómetro: transcripción → brief → cotización → publicación → QR | "Transcribe, entiende qué necesita el negocio, cotiza tres opciones con tu tarifa y publica un prototipo. Las cuentas las hace un script: nunca inventa un precio." |
| 1:15–1:45 | Escaneás el QR con el celular y navegás el prototipo (menú con fotos, pedido, panel) | "Esto es lo que ve tu cliente: una app con sus servicios y sus precios, que puede tocar." |
| 1:45–2:05 | Abrís la propuesta, tocás "Acepto" y se abre WhatsApp con el mensaje listo | "Elige una opción y te acepta por WhatsApp. Del audio al sí." |
| 2:05–2:20 | Tiempo final en pantalla + cita de un builder | "Dos minutos. Lo probaron [N] builders: '[cita]'." |
| 2:20–2:30 | Comandos de instalación | "Trato Hecho. Instalalo con dos comandos." |

## Mensaje para pedirle a builders que lo prueben

> ¡Hola! Estoy participando en una hackathon con un plugin de Claude Code para freelancers: le pasás el audio de WhatsApp de un cliente y en 2 minutos te arma brief, cotización con 3 opciones, un prototipo publicado y la propuesta para mandarle. ¿Me lo probás con un audio de algún cliente (o inventado)? Te lleva 5 minutos:
>
> ```
> /plugin marketplace add Rom4n10/trato-hecho
> /plugin install trato@trato-hecho
> /trato:setup
> /trato:crear ruta/al/audio.ogg
> ```
>
> Si no tenés audio a mano: `/trato:crear ejemplo barberia`. Después contame en una frase qué te pareció y si puedo citarte. ¡Gracias!
