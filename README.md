# mattEvan — Catálogo y gestión de pedidos

Sitio público y panel administrativo para gestionar productos, categorías, pedidos personalizados, inventario, promociones y galería.

## Archivos

- `index.html` — estructura principal
- `styles.css` — diseño responsive, glassmorphism, paleta neón
- `script.js` — catálogo, carrito, pedidos, WhatsApp y contenido dinámico
- `admin.html`, `admin.css`, `admin.js` — panel administrativo
- `firestore.rules` — reglas de lectura pública y creación segura de pedidos
- `firebase.json` — configuración para desplegar las reglas de Firestore
- `vercel.json` — configuración básica para Vercel
- `assets/` — imágenes generadas

## Funciones principales

- Categorías dinámicas relacionadas con productos.
- Campos de pedido configurables por categoría, presentes en catálogo, productos y encargos.
- Carrito con cantidades, variantes, stock y totales.
- Pedidos con folio seguro, estados, fecha de entrega, modalidad de pago y saldo.
- Historial auditable de anticipos y abonos, recibos, cancelación de movimientos y liquidación automática.
- Acuerdos de pago de contado, parcialidades o crédito, con próxima fecha de cobro y alertas de vencimiento.
- Kanban: nuevos, cotizados, producción, listos, entregados y cancelados.
- Entrega controlada: impide entregar con deuda salvo crédito autorizado y descuenta inventario una sola vez.
- Agenda de entregas y cobros, historial por cliente y exportación CSV de pedidos y pagos.
- Formulario público con archivo Base64 opcional y seguimiento por folio sin exponer los datos del cliente.
- Configuración de WhatsApp y redes desde el administrador.
- Imágenes comprimidas y guardadas como Base64 en Firestore, sin depender de Firebase Storage.

## Publicación

El sitio se despliega en Vercel al actualizar la rama principal. Las reglas de Firestore se despliegan por separado:

```bash
firebase deploy --only firestore:rules
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

La página pública puede leer el catálogo, crear pedidos y consultar únicamente el resumen sanitizado de un folio difícil de adivinar. No puede listar, leer, modificar ni eliminar encargos. El panel requiere Firebase Authentication y las escrituras administrativas están restringidas al UID autorizado. Se recomienda activar Firebase App Check para reducir spam automatizado.
