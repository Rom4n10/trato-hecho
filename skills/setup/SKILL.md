---
name: setup
description: Configura VozApp por primera vez o verifica que todo esté listo (clave de transcripción, Vercel, tarifa por hora, moneda, nombre y WhatsApp del freelancer). Usar cuando el usuario instala VozApp, cuando /vozapp:crear reporta configuración faltante, o cuando quiere cambiar su tarifa o datos.
allowed-tools: Bash(node:*), Bash(npx vercel login:*)
---

# VozApp · setup

Los scripts están en `${CLAUDE_PLUGIN_ROOT}/scripts/` (si la variable no está definida, es la carpeta `scripts/` dos niveles arriba del directorio de este skill). Hablá en español neutro, corto y amable.

1. Corré `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"` y mostrá el checklist tal cual.
2. Por cada ❌ o ⚠️, pedí el dato **de a uno**, con una línea de dónde conseguirlo:
   - **Clave de transcripción** → `GROQ_API_KEY`: gratis en console.groq.com → API Keys (empieza con `gsk_`). Alternativa: `OPENAI_API_KEY`.
   - **Vercel** (opcional) → si ya hay sesión del CLI no hace falta nada. Si no: `VERCEL_TOKEN` desde vercel.com → Settings → Tokens. Sin esto, los links son locales.
   - **tarifaHora** → número, lo que cobra por hora. **moneda** → USD, ARS, MXN, CRC, COP, CLP, PEN, UYU…
   - **nombre** → cómo firma las propuestas. **whatsapp** → con código de país, para el botón "Acepto".
   Si el usuario prefiere no pegar claves en el chat, decile que las defina como variables de entorno (`GROQ_API_KEY`, `VERCEL_TOKEN`) y vuelva a correr `/vozapp:setup`.
3. Guardá cada dato con `node "${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs" set clave=valor` (podés pasar varios `clave=valor` juntos; usá comillas si el valor tiene espacios). El script valida, guarda en `~/.vozapp/config.json` con permisos 600 y enmascara las claves. **Nunca repitas una clave completa en el chat**: solo los últimos 4 caracteres.
4. Corré `doctor.mjs` de nuevo. Si no queda ningún ❌, terminá con: "Listo. Probalo con `/vozapp:crear <ruta-al-audio>`."
