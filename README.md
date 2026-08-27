# mattEvan — Catálogo y gestión de pedidos

Sitio público y panel administrativo para gestionar productos, categorías, pedidos personalizados, inventario, promociones y galería.

## Archivos

- `index.html` — estructura principal
- `styles.css` — diseño responsive, glassmorphism, paleta neón
- `script.js` — catálogo, carrito, pedidos, WhatsApp y contenido dinámico
- `admin.html`, `admin.css`, `admin.js` — panel administrativo
- `firestore.rules` — reglas de lectura pública y creación segura de pedidos
- `firebase.json` — configuración para desplegar reglas de Firestore y Storage
- `storage.rules` — lectura pública y carga protegida de imágenes/PDF
- `vercel.json` — configuración básica para Vercel
- `assets/` — imágenes generadas

## Funciones principales

- Categorías dinámicas relacionadas con productos.
- Carrito con cantidades, stock y totales.
- Pedidos con folio, estados, fecha de entrega, anticipo y saldo.
- Kanban: nuevos, cotizados, producción, listos, entregados y cancelados.
- Formulario público conectado a la colección `encargos`.
- Configuración de WhatsApp y redes desde el administrador.

## Publicación

El sitio se despliega en Vercel al actualizar la rama principal. Las reglas de Firestore se despliegan por separado:

```bash
firebase deploy --only firestore:rules,storage
```

Antes de hacerlo, inicia sesión con Firebase CLI y selecciona el proyecto `mattevan-6c73f`.

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

## Seguridad

La página pública puede leer el catálogo y crear pedidos, pero no leer, modificar ni eliminar encargos. El panel requiere Firebase Authentication. Se recomienda activar Firebase App Check para reducir spam automatizado.
