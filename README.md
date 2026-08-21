# mattEvan — Sitio Web

Landing page estática lista para Vercel. Evolucionada de una simple "venta de garage" a un catálogo completo de productos y servicios (Papelería, Diseño, Personalizados).

## Archivos

- `index.html` — estructura principal
- `styles.css` — diseño responsive, glassmorphism, paleta neón
- `script.js` — lógica de filtros, menú móvil, WhatsApp, formulario y animaciones
- `vercel.json` — configuración básica para Vercel
- `assets/` — imágenes generadas

## Antes de publicar

Abre `script.js` y cambia las variables de configuración en la parte superior:

```javascript
const CONFIG = {
    WHATSAPP_NUMBER: "5215512345678", // Cambia esto por tu número sin + ni espacios
    INSTAGRAM_URL: "https://instagram.com/tu_cuenta",
};
```

## Publicar en Vercel

**Opción 1: Arrastrar carpeta**
1. Entra a Vercel.
2. Crea un proyecto nuevo.
3. Sube la carpeta `mattevan-web` o conéctala desde GitHub.
4. No requiere framework ni comando de build.

**Opción 2: Vercel CLI**
```bash
npm i -g vercel
vercel
```

## Notas
La página no requiere servidor ni base de datos. El formulario abre WhatsApp con el mensaje prellenado, y los botones de los productos hacen lo mismo. Todo el SEO básico está incluido en el `index.html`.
