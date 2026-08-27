// ============================================
// MATTEVAN ADMIN - FIREBASE COMPLETO
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, writeBatch, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBpEFLhubbnSpy5W3ziUpovZC-KN8RYtWQ",
    authDomain: "mattevan-6c73f.firebaseapp.com",
    projectId: "mattevan-6c73f",
    storageBucket: "mattevan-6c73f.firebasestorage.app",
    messagingSenderId: "785204146637",
    appId: "1:785204146637:web:75a4648870853886081484"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
}

function slugify(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateNextPaymentDate(currentDate, frequency) {
    if (!currentDate || !frequency) return currentDate || '';
    const date = new Date(`${currentDate}T12:00:00`);
    if (frequency === 'Semanal') date.setDate(date.getDate() + 7);
    if (frequency === 'Quincenal') date.setDate(date.getDate() + 15);
    if (frequency === 'Mensual') date.setMonth(date.getMonth() + 1);
    return localDateKey(date);
}

function createOrderFolio() {
    const date = new Date();
    const day = date.toISOString().slice(0, 10).replaceAll('-', '');
    return `ME-${day}-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}

function getCategoryName(slug) {
    return allCategories.find(category => category.slug === slug)?.nombre || slug || 'Sin categoría';
}

const DEFAULT_CATEGORIES = [
    { nombre: 'Garage / Bazar', slug: 'garage', icono: '🏷️', descripcion: 'Productos nuevos, seminuevos y oportunidades de garage.', camposPedido: ['Cantidad', 'Forma de entrega'], activa: true },
    { nombre: 'Personalizados', slug: 'custom', icono: '🎨', descripcion: 'Tazas, playeras, stickers, gorras y artículos personalizados.', camposPedido: ['Producto', 'Cantidad', 'Color', 'Talla o medida'], activa: true },
    { nombre: 'Copias, Impresiones y Escáner', slug: 'copias-impresiones-escaner', icono: '🖨️', descripcion: 'Copias, impresiones a color o blanco y negro, digitalización y escáner.', camposPedido: ['Número de páginas', 'Cantidad de juegos', 'Tamaño', 'Color o blanco y negro'], activa: true },
    { nombre: 'Papelería', slug: 'papeleria', icono: '✏️', descripcion: 'Artículos escolares, de oficina y papelería en general.', camposPedido: ['Artículo', 'Cantidad', 'Marca preferida'], activa: true }
];


// ============ DOM ELEMENTS ============
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal');
const sectionTitleEl = document.getElementById('section-title');

// ============ TOAST ============
function toast(msg, isError = false) {
    const t = document.getElementById('admin-toast');
    t.textContent = msg;
    t.className = 'admin-toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'admin-toast', 3000);
}

// ============ MODAL HELPERS ============
function openModal(title, htmlContent) {
    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    modal.classList.add('active');
    requestAnimationFrame(() => modalBody.querySelector('input, select, textarea, button')?.focus());
}
function closeModal() { modal.classList.remove('active'); }
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('active')) closeModal();
    if (event.key === 'Enter' && loginScreen.classList.contains('active')) loginBtn.click();
});

// ============ SIDEBAR NAVIGATION ============
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.dataset.section;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        sectionTitleEl.textContent = item.querySelector('span').textContent;
        sidebar.classList.remove('open');
    });
});

mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

// ============ AUTH ============
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        loadAll();
    } else {
        loginScreen.classList.add('active');
        dashboardScreen.classList.remove('active');
    }
});

loginBtn.addEventListener('click', () => {
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .then(() => loginError.textContent = '')
        .catch(() => loginError.textContent = 'Error: Credenciales incorrectas.');
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => { emailInput.value = ''; passwordInput.value = ''; });
});

// ============ LOAD ALL DATA ============
async function loadAll() {
    // Las categorías son la fuente central; deben existir antes de cargar formularios y productos.
    await loadCategories();
    await Promise.all([
        loadProducts(),
        loadEncargos(),
        loadNovedades(),
        loadPromos(),
        loadGallery(),
        loadConfig()
    ]);
    await loadCategories(); // Actualiza los conteos una vez cargados los productos.
    updateDashboard();
}

// ======================================================
//  PRODUCTOS
// ======================================================
let allProducts = [];
let allCategories = [];

document.getElementById('add-product-btn').addEventListener('click', () => showProductForm());

async function loadProducts() {
    const list = document.getElementById('admin-products-list');
    list.innerHTML = '<p class="loading-text">Cargando...</p>';
    const snap = await getDocs(collection(db, "productos"));
    allProducts = [];
    snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));

    if (allProducts.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay productos todavía. ¡Agrega el primero!</p>';
        return;
    }

    const vendidos = allProducts.filter(p => p.estado === 'Vendido');
    const activos  = allProducts.filter(p => p.estado !== 'Vendido');

    // Banner de historial si hay vendidos
    const historicoBanner = vendidos.length > 0 ? `
        <div class="sold-history-banner">
            <span>📆 Historial: <strong>${vendidos.length}</strong> producto${vendidos.length > 1 ? 's' : ''} vendido${vendidos.length > 1 ? 's' : ''} (oculto${vendidos.length > 1 ? 's' : ''} en tu página)</span>
            <button class="btn-clear-history" onclick="clearSoldHistory()">
                <i class="fa-solid fa-broom"></i> Limpiar historial
            </button>
        </div>` : '';

    list.innerHTML = historicoBanner + allProducts.map(p => {
        const badgeClass = p.estado === 'Vendido' ? 'badge-vendido' : p.estado === 'Apartado' ? 'badge-apartado' : 'badge-disponible';
        const imgUrl = p.imagen || 'https://via.placeholder.com/300x200?text=Sin+Imagen';
        const soldStyle = p.estado === 'Vendido' ? 'opacity:0.5; filter:grayscale(80%);' : '';
        const qty = p.cantidad ?? 1;
        const stockLabel = p.estado === 'Vendido' ? '' :
            qty <= 0 ? `<span class="stock-badge agotado">⚠️ Agotado</span>` :
            qty <= 2 ? `<span class="stock-badge pocas">🔥 ${qty} restante${qty > 1 ? 's' : ''}</span>` :
            `<span class="stock-badge normal">📦 Stock: ${qty}</span>`;
            
        const priceHtml = p.precioViejo 
            ? `<p class="price"><span class="old-price">$${p.precioViejo}</span> $${p.precio} MXN</p>`
            : `<p class="price">$${p.precio} MXN</p>`;

        return `
        <div class="product-card" style="${soldStyle}">
            <img src="${imgUrl}" alt="${p.nombre}">
            <div class="product-card-body">
                <span class="badge ${badgeClass}">${p.estado || 'Disponible'}</span>
                ${stockLabel}
                <h3>${p.nombre}</h3>
                ${priceHtml}
                <p class="cat-label">${escapeHtml(getCategoryName(p.categoria))}</p>
                <div class="card-actions">
                    <button class="btn-edit" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                    ${p.estado === 'Vendido' ? `<button class="btn-ticket" onclick="generateTicket('${p.id}')"><i class="fa-solid fa-receipt"></i> Recibo</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function showProductForm(product = null) {
    const isEdit = !!product;
    if (!isEdit && allCategories.length === 0) {
        toast('Primero crea al menos una categoría', true);
        document.querySelector('[data-section="sec-categorias"]')?.click();
        return;
    }
    const catsToUse = allCategories;
    
    const catOptions = catsToUse.filter(c => c.activa !== false || product?.categoria === c.slug).map(c => `<option value="${escapeHtml(c.slug)}" ${product && product.categoria === c.slug ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('');

    openModal(isEdit ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO', `
        <form id="pf">
            <div class="form-group"><label>Nombre</label><input type="text" id="pf-name" required value="${product?.nombre || ''}" placeholder="Ej. Camiseta Mattevan"></div>
            <div class="form-row" style="grid-template-columns: 1fr 1fr 1fr;">
                <div class="form-group"><label>Precio de Oferta (MXN)</label><input type="number" id="pf-price" required value="${product?.precio || ''}" placeholder="250"></div>
                <div class="form-group"><label>Precio Original (Opcional)</label><input type="number" id="pf-price-old" value="${product?.precioViejo || ''}" placeholder="350"></div>
                <div class="form-group"><label>Cantidad (Stock)</label><input type="number" id="pf-qty" min="0" value="${product?.cantidad ?? 1}" placeholder="1"></div>
            </div>
            <div class="form-group"><label>Categoría</label><select id="pf-cat">${catOptions || '<option value="general">Sin categorías</option>'}</select></div>
            <div class="form-group"><label>Estado</label>
                <select id="pf-status">
                    <option value="Disponible" ${product?.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
                    <option value="Vendido" ${product?.estado === 'Vendido' ? 'selected' : ''}>Vendido</option>
                    <option value="Apartado" ${product?.estado === 'Apartado' ? 'selected' : ''}>Apartado</option>
                </select>
            </div>
            <div class="form-group"><label>Descripción (opcional)</label><textarea id="pf-desc" placeholder="Detalles del producto...">${product?.descripcion || ''}</textarea></div>
            <div class="form-group"><label>Variantes (una por línea: Nombre | Precio extra | Stock)</label><textarea id="pf-variants" placeholder="Talla M | 0 | 5&#10;Talla G | 20 | 3">${(product?.variantes || []).map(variant => `${variant.nombre} | ${variant.precioExtra || 0} | ${variant.stock || 0}`).join('\n')}</textarea></div>
            <div class="form-group"><label>Archivo (Imagen o PDF)</label><input type="file" id="pf-img" accept="image/*,application/pdf">
                ${product?.imagen && product.imagen.startsWith('data:image') ? `<img src="${product.imagen}" class="img-preview">` : ''}
                ${product?.imagen && product.imagen.startsWith('data:application/pdf') ? `<p style="color:var(--tertiary); font-size: 0.9rem; margin-top:5px;"><i class="fa-solid fa-file-pdf"></i> PDF adjunto actual</p>` : ''}
            </div>
            <button type="submit" class="beast-btn" style="width:100%">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'} 🚀</button>
        </form>
    `);

    document.getElementById('pf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
            const oldPriceVal = document.getElementById('pf-price-old').value;
            const data = {
                nombre: document.getElementById('pf-name').value,
                precio: Number(document.getElementById('pf-price').value),
                precioViejo: oldPriceVal ? Number(oldPriceVal) : null,
                cantidad: document.getElementById('pf-qty').value === '' ? 1 : Math.max(0, Number(document.getElementById('pf-qty').value)),
                categoria: document.getElementById('pf-cat').value,
                estado: document.getElementById('pf-status').value,
                descripcion: document.getElementById('pf-desc').value,
                variantes: document.getElementById('pf-variants').value.split('\n').map(line => {
                    const [nombre, precioExtra, stock] = line.split('|').map(value => value?.trim());
                    return { nombre, precioExtra: Number(precioExtra) || 0, stock: Math.max(0, Number(stock) || 0) };
                }).filter(variant => variant.nombre),
            };

            const fileInput = document.getElementById('pf-img');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                data.imagen = await fileToBase64(file);
            } else if (isEdit && product.imagen) {
                data.imagen = product.imagen;
            }

            if (isEdit) {
                await updateDoc(doc(db, "productos", product.id), data);
                toast('Producto actualizado ✅');
            } else {
                data.fechaCreacion = new Date();
                await addDoc(collection(db, "productos"), data);
                toast('Producto creado ✅');
            }
            closeModal();
            await loadProducts();
            updateDashboard();
        } catch (err) {
            console.error(err);
            toast('Error al guardar', true);
        }
    });
}

window.editProduct = function(id) {
    const p = allProducts.find(x => x.id === id);
    if (p) showProductForm(p);
};

window.deleteProduct = async function(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
        await deleteDoc(doc(db, "productos", id));
        toast('Producto eliminado 🗑️');
        await loadProducts();
        updateDashboard();
    } catch (err) {
        console.error(err);
        alert('Error exacto de Firebase al intentar eliminar el producto: ' + err.message);
        toast('Error al eliminar', true); 
    }
};

window.clearSoldHistory = async function() {
    const vendidos = allProducts.filter(p => p.estado === 'Vendido');
    if (vendidos.length === 0) { toast('No hay vendidos que limpiar'); return; }
    if (!confirm(`¿Eliminar los ${vendidos.length} productos vendidos del historial? Esta acción no se puede deshacer.`)) return;
    
    try {
        const deletes = vendidos.map(p => deleteDoc(doc(db, "productos", p.id)));
        await Promise.all(deletes);
        toast(`¡Historial limpio! ${vendidos.length} vendido${vendidos.length > 1 ? 's' : ''} eliminado${vendidos.length > 1 ? 's' : ''} 🗑️`);
        await loadProducts();
        updateDashboard();
    } catch (err) {
        console.error(err);
        alert('Error al limpiar: ' + err.message);
        toast('Error al limpiar historial', true);
    }
};

// ======================================================
// GENERADOR DE TICKETS (RECIBOS)
// ======================================================
window.generateTicket = function(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde decorativo
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Texto Header
    ctx.fillStyle = '#121212';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('mattEvan', canvas.width / 2, 70);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('Comprobante de Venta', canvas.width / 2, 100);

    // Separador
    ctx.beginPath();
    ctx.moveTo(30, 120);
    ctx.lineTo(370, 120);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Detalles del Producto
    ctx.fillStyle = '#121212';
    ctx.font = 'bold 22px Arial';
    
    // Función para envolver texto largo
    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, y);
        return y;
    }

    let nextY = wrapText(ctx, product.nombre, canvas.width / 2, 160, 340, 30);

    // Precio
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ff007f';
    ctx.fillText(`$${product.precio} MXN`, canvas.width / 2, nextY + 50);

    // Separador
    ctx.beginPath();
    ctx.moveTo(30, nextY + 80);
    ctx.lineTo(370, nextY + 80);
    ctx.stroke();

    // Footer
    ctx.fillStyle = '#121212';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('¡GRACIAS POR TU COMPRA!', canvas.width / 2, nextY + 130);
    
    const date = new Date().toLocaleDateString('es-MX');
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(`Fecha: ${date}`, canvas.width / 2, nextY + 160);

    // Descargar
    const link = document.createElement('a');
    link.download = `Recibo_mattEvan_${product.nombre.substring(0, 10).replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Recibo generado 🧾');
};

// ======================================================
//  CATEGORÍAS
// ======================================================
document.getElementById('add-category-btn').addEventListener('click', () => showCategoryForm());

async function loadCategories() {
    const list = document.getElementById('admin-categories-list');
    list.innerHTML = '<p class="loading-text">Cargando...</p>';
    let snap = await getDocs(collection(db, "categorias"));
    if (snap.empty) {
        const seedMarker = await getDoc(doc(db, "configuracion", "categorySeed"));
        if (!seedMarker.exists()) {
            const batch = writeBatch(db);
            DEFAULT_CATEGORIES.forEach(category => batch.set(doc(db, "categorias", category.slug), category));
            batch.set(doc(db, "configuracion", "categorySeed"), { completado: true, fecha: serverTimestamp() });
            await batch.commit();
            snap = await getDocs(collection(db, "categorias"));
            toast('Categorías base sincronizadas ✅');
        }
    }
    const fieldsMarker = await getDoc(doc(db, "configuracion", "categoryFieldsV1"));
    if (!fieldsMarker.exists() && !snap.empty) {
        const batch = writeBatch(db);
        let hasUpdates = false;
        snap.forEach(categoryDoc => {
            const defaults = DEFAULT_CATEGORIES.find(category => category.slug === categoryDoc.data().slug);
            if (defaults && !Array.isArray(categoryDoc.data().camposPedido)) {
                batch.update(categoryDoc.ref, { camposPedido: defaults.camposPedido });
                hasUpdates = true;
            }
        });
        batch.set(doc(db, "configuracion", "categoryFieldsV1"), { completado: true, fecha: serverTimestamp() });
        await batch.commit();
        if (hasUpdates) snap = await getDocs(collection(db, "categorias"));
    }
    allCategories = [];
    snap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));

    if (allCategories.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay categorías. Agrega las que necesites.</p>';
        return;
    }

    list.innerHTML = allCategories.map(c => {
        const relatedCount = allProducts.filter(p => p.categoria === c.slug).length;
        return `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${escapeHtml(c.icono || '🏷️')} ${escapeHtml(c.nombre)} <span style="color:var(--text-muted);font-size:.8rem;">(${escapeHtml(c.slug)})</span></h4>
                <p>${escapeHtml(c.descripcion || 'Sin descripción')}</p>
                <p>${relatedCount} producto${relatedCount === 1 ? '' : 's'} · ${c.activa === false ? 'Oculta' : 'Visible'}</p>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editCategory('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteCategory('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function showCategoryForm(cat = null) {
    const isEdit = !!cat;
    openModal(isEdit ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA', `
        <form id="cf">
            <div class="form-group"><label>Nombre (ej. Garage / Bazar)</label><input type="text" id="cf-name" required value="${cat?.nombre || ''}"></div>
            <div class="form-row">
                <div class="form-group"><label>Slug</label><input type="text" id="cf-slug" required value="${cat?.slug || ''}" placeholder="copias-scanner"></div>
                <div class="form-group"><label>Icono (emoji)</label><input type="text" id="cf-icon" maxlength="4" value="${cat?.icono || '🏷️'}"></div>
            </div>
            <div class="form-group"><label>Descripción</label><textarea id="cf-description" placeholder="Describe los productos o servicios de esta categoría">${cat?.descripcion || ''}</textarea></div>
            <div class="form-group"><label>Campos para pedidos (separados por coma)</label><input type="text" id="cf-fields" value="${escapeHtml((cat?.camposPedido || []).join(', '))}" placeholder="Ej. Tamaño, Color, Cantidad, Acabado"></div>
            <div class="form-group"><label><input type="checkbox" id="cf-active" ${cat?.activa !== false ? 'checked' : ''}> Visible en catálogo y formulario de pedidos</label></div>
            <button type="submit" class="beast-btn" style="width:100%">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'} 🏷️</button>
        </form>
    `);
    document.getElementById('cf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nombre: document.getElementById('cf-name').value.trim(),
            slug: slugify(document.getElementById('cf-slug').value),
            icono: document.getElementById('cf-icon').value.trim() || '🏷️',
            descripcion: document.getElementById('cf-description').value.trim(),
            camposPedido: document.getElementById('cf-fields').value.split(',').map(field => field.trim()).filter(Boolean).slice(0, 12),
            activa: document.getElementById('cf-active').checked
        };
        if (!data.slug) { toast('El slug no es válido', true); return; }
        const duplicate = allCategories.some(c => c.slug === data.slug && c.id !== cat?.id);
        if (duplicate) { toast('Ya existe una categoría con ese slug', true); return; }
        try {
            if (isEdit) {
                const batch = writeBatch(db);
                batch.update(doc(db, "categorias", cat.id), data);
                if (cat.slug !== data.slug) {
                    allProducts.filter(p => p.categoria === cat.slug).forEach(p => {
                        batch.update(doc(db, "productos", p.id), { categoria: data.slug });
                    });
                }
                await batch.commit();
                toast('Categoría y productos actualizados ✅');
            }
            else { await addDoc(collection(db, "categorias"), data); toast('Categoría creada ✅'); }
            closeModal();
            await Promise.all([loadCategories(), loadProducts()]);
            updateDashboard();
        } catch (err) { toast('Error', true); }
    });
    const categoryNameInput = document.getElementById('cf-name');
    const categorySlugInput = document.getElementById('cf-slug');
    categoryNameInput.addEventListener('input', () => {
        if (!isEdit || !categorySlugInput.dataset.edited) categorySlugInput.value = slugify(categoryNameInput.value);
    });
    categorySlugInput.addEventListener('input', () => { categorySlugInput.dataset.edited = 'true'; });
}

window.editCategory = function(id) { const c = allCategories.find(x => x.id === id); if (c) showCategoryForm(c); };
window.deleteCategory = async function(id) {
    const category = allCategories.find(c => c.id === id);
    if (!category) return;
    const relatedCount = allProducts.filter(p => p.categoria === category.slug).length;
    if (relatedCount > 0) {
        toast(`No se puede eliminar: tiene ${relatedCount} producto${relatedCount === 1 ? '' : 's'}. Reasígnalos primero.`, true);
        return;
    }
    if (!confirm(`¿Eliminar la categoría "${category.nombre}"?`)) return;
    try { await deleteDoc(doc(db, "categorias", id)); toast('Categoría eliminada 🗑️'); await loadCategories(); updateDashboard(); } catch (err) {
        console.error(err);
        alert('Error exacto: ' + err.message);
        toast('Error', true); 
    }
};

// ======================================================
//  ENCARGOS / PEDIDOS
// ======================================================
let allEncargos = [];
document.getElementById('add-encargo-btn').addEventListener('click', () => showEncargoForm());
document.getElementById('encargos-search')?.addEventListener('input', renderEncargos);
document.getElementById('encargos-status-filter')?.addEventListener('change', renderEncargos);
document.getElementById('customer-history-search')?.addEventListener('input', renderCustomerHistory);
document.getElementById('payments-date-filter')?.addEventListener('change', renderPaymentsReport);
document.getElementById('payments-method-filter')?.addEventListener('change', renderPaymentsReport);
document.getElementById('export-orders-btn')?.addEventListener('click', exportOrdersCsv);
document.getElementById('export-payments-btn')?.addEventListener('click', exportPaymentsCsv);

function normalizeOrderStatus(status) {
    return ({ Pendiente: 'Nuevo', Conseguido: 'Listo', Creado: 'Listo' })[status] || status || 'Nuevo';
}

async function completeOrderDelivery(orderId) {
    await runTransaction(db, async transaction => {
        const orderRef = doc(db, 'encargos', orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error('El pedido ya no existe.');
        const orderData = orderSnap.data();
        const items = Array.isArray(orderData.items) ? orderData.items.filter(item => item.id && Number(item.cantidad) > 0) : [];
        const productSnapshots = [];
        if (!orderData.inventarioAplicado) {
            for (const item of items) {
                const productRef = doc(db, 'productos', item.id);
                productSnapshots.push({ item, productRef, snapshot: await transaction.get(productRef) });
            }
        }
        productSnapshots.forEach(({ item, productRef, snapshot }) => {
            if (!snapshot.exists()) return;
            const productData = snapshot.data();
            if (item.variante && Array.isArray(productData.variantes)) {
                const variants = productData.variantes.map(variant => variant.nombre === item.variante
                    ? { ...variant, stock: Math.max(0, Number(variant.stock || 0) - Number(item.cantidad)) }
                    : variant);
                const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
                transaction.update(productRef, { variantes: variants, cantidad: totalStock, estado: totalStock === 0 ? 'Vendido' : (productData.estado || 'Disponible') });
            } else {
                const currentStock = Number(productData.cantidad ?? 0);
                const newStock = Math.max(0, currentStock - Number(item.cantidad));
                transaction.update(productRef, { cantidad: newStock, estado: newStock === 0 ? 'Vendido' : (productData.estado || 'Disponible') });
            }
        });
        transaction.update(orderRef, { estado: 'Entregado', inventarioAplicado: true, entregadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
    });
}

async function loadEncargos() {
    const snap = await getDocs(collection(db, "encargos"));
    allEncargos = [];
    snap.forEach(d => allEncargos.push({ id: d.id, ...d.data() }));
    await Promise.all(allEncargos.map(async order => {
        const paymentsSnap = await getDocs(collection(db, "encargos", order.id, "pagos"));
        order.pagos = [];
        paymentsSnap.forEach(payment => order.pagos.push({ id: payment.id, ...payment.data() }));
        order.pagos.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
        const activePayments = order.pagos.filter(payment => !payment.cancelado);
        const historyTotal = roundMoney(activePayments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0));
        order.pagadoCalculado = activePayments.length > 0
            ? historyTotal
            : Number(order.pagado ?? order.anticipo ?? 0);
        order.saldoCalculado = Math.max(0, roundMoney(Number(order.total || order.precio || 0) - order.pagadoCalculado));
    }));
    allEncargos.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
    await syncTrackingOrders(allEncargos);
    renderEncargos();
    renderOperationalViews();
    setupKanbanDropZones();
}

async function syncTrackingOrders(orders) {
    const eligible = orders.filter(order => order.folio && order.folio.split('-').pop().length >= 8);
    if (!eligible.length) return;
    const batch = writeBatch(db);
    eligible.forEach(order => batch.set(doc(db, 'seguimiento', order.folio), {
        folio: order.folio,
        estado: normalizeOrderStatus(order.estado),
        fechaEntrega: order.fechaEntrega || '',
        total: Number(order.total || 0),
        pagado: Number(order.pagadoCalculado || 0),
        saldo: Number(order.saldoCalculado || 0),
        actualizadoEn: serverTimestamp()
    }, { merge: true }));
    await batch.commit();
}

function localDateKey(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getPaymentRows() {
    return allEncargos.flatMap(order => (order.pagos || []).map(payment => ({ order, payment })));
}

function renderOperationalViews() {
    const today = localDateKey();
    const active = allEncargos.filter(order => !['Entregado', 'Cancelado'].includes(normalizeOrderStatus(order.estado)));
    const newOrders = active.filter(order => normalizeOrderStatus(order.estado) === 'Nuevo').length;
    const overdueDeliveries = active.filter(order => order.fechaEntrega && order.fechaEntrega < today).length;
    const overduePayments = active.filter(order => Number(order.saldoCalculado || 0) > 0 && order.proximoPago && order.proximoPago < today).length;
    const ready = active.filter(order => normalizeOrderStatus(order.estado) === 'Listo').length;
    const alerts = document.getElementById('dashboard-alerts');
    if (alerts) alerts.innerHTML = [
        newOrders ? `<div class="operational-alert">🆕 ${newOrders} pedido${newOrders === 1 ? '' : 's'} nuevo${newOrders === 1 ? '' : 's'} sin revisar</div>` : '',
        overdueDeliveries ? `<div class="operational-alert danger">⚠️ ${overdueDeliveries} entrega${overdueDeliveries === 1 ? '' : 's'} vencida${overdueDeliveries === 1 ? '' : 's'}</div>` : '',
        overduePayments ? `<div class="operational-alert danger">💳 ${overduePayments} pago${overduePayments === 1 ? '' : 's'} vencido${overduePayments === 1 ? '' : 's'}</div>` : '',
        ready ? `<div class="operational-alert warning">📦 ${ready} pedido${ready === 1 ? '' : 's'} listo${ready === 1 ? '' : 's'} por entregar</div>` : ''
    ].filter(Boolean).join('') || '<div class="operational-alert">✅ Sin alertas pendientes</div>';

    const events = active.flatMap(order => [
        ...(order.fechaEntrega ? [{ date: order.fechaEntrega, type: 'Entrega', order }] : []),
        ...(Number(order.saldoCalculado || 0) > 0 && order.proximoPago ? [{ date: order.proximoPago, type: 'Cobro', order }] : [])
    ]).sort((a, b) => a.date.localeCompare(b.date));
    const agenda = document.getElementById('agenda-events');
    if (agenda) agenda.innerHTML = events.length ? events.map(event => {
        const cssClass = event.date < today ? 'overdue' : event.date === today ? 'today' : '';
        return `<div class="agenda-event ${cssClass}"><div><strong>${event.type === 'Entrega' ? '📦' : '💳'} ${escapeHtml(event.type)} · ${escapeHtml(event.order.cliente)}</strong><small>${escapeHtml(event.order.folio || '')} · ${escapeHtml(event.order.producto)}</small></div><span>${escapeHtml(event.date)}</span></div>`;
    }).join('') : '<p class="empty-state">No hay entregas o cobros programados.</p>';
    renderPaymentsReport();
    renderCustomerHistory();
}

function renderCustomerHistory() {
    const container = document.getElementById('customer-history-results');
    if (!container) return;
    const search = document.getElementById('customer-history-search')?.value.toLowerCase().trim() || '';
    if (search.length < 2) { container.innerHTML = '<p class="empty-state">Busca un cliente para consultar pedidos, pagos y deuda.</p>'; return; }
    const orders = allEncargos.filter(order => `${order.cliente || ''} ${order.telefono || ''}`.toLowerCase().includes(search));
    const totalPurchased = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalPaid = orders.reduce((sum, order) => sum + Number(order.pagadoCalculado || 0), 0);
    container.innerHTML = orders.length ? `<p><strong>${orders.length} pedidos · Comprado $${totalPurchased.toLocaleString('es-MX')} · Pagado $${totalPaid.toLocaleString('es-MX')} · Deuda $${Math.max(0, totalPurchased - totalPaid).toLocaleString('es-MX')}</strong></p>` + orders.map(order =>
        `<div class="customer-history-item"><div><strong>${escapeHtml(order.folio || 'Sin folio')} · ${escapeHtml(order.producto)}</strong><small>${escapeHtml(normalizeOrderStatus(order.estado))} · ${order.pagos.filter(payment => !payment.cancelado).length} pagos</small></div><span>Saldo $${Number(order.saldoCalculado || 0).toLocaleString('es-MX')}</span></div>`
    ).join('') : '<p class="empty-state">No se encontraron pedidos.</p>';
}

function renderPaymentsReport() {
    const container = document.getElementById('payments-report');
    if (!container) return;
    const dateFilter = document.getElementById('payments-date-filter')?.value || '';
    const methodFilter = document.getElementById('payments-method-filter')?.value || 'all';
    const rows = getPaymentRows().filter(({ payment }) => {
        const date = payment.fecha?.toDate ? localDateKey(payment.fecha.toDate()) : '';
        return (!dateFilter || date === dateFilter) && (methodFilter === 'all' || payment.metodo === methodFilter);
    });
    const activeTotal = rows.filter(row => !row.payment.cancelado).reduce((sum, row) => sum + Number(row.payment.monto || 0), 0);
    container.innerHTML = `<p><strong>Total filtrado: $${activeTotal.toLocaleString('es-MX')} MXN</strong></p>` + (rows.length ? rows.map(({ order, payment }) =>
        `<div class="report-row ${payment.cancelado ? 'payment-cancelled' : ''}"><div><strong>${escapeHtml(order.cliente)} · ${escapeHtml(payment.metodo || '')}</strong><small>${escapeHtml(order.folio || '')} · ${escapeHtml(payment.nota || 'Sin referencia')}</small></div><span>${payment.cancelado ? 'Cancelado' : '$' + Number(payment.monto).toLocaleString('es-MX')}</span></div>`
    ).join('') : '<p class="empty-state">No hay movimientos con estos filtros.</p>');
}

function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

function exportOrdersCsv() {
    downloadCsv(`pedidos-mattevan-${localDateKey()}.csv`, [['Folio','Cliente','Teléfono','Producto','Estado','Total','Pagado','Saldo','Entrega','Próximo pago'], ...allEncargos.map(order => [order.folio, order.cliente, order.telefono, order.producto, normalizeOrderStatus(order.estado), order.total, order.pagadoCalculado, order.saldoCalculado, order.fechaEntrega, order.proximoPago])]);
}

function exportPaymentsCsv() {
    downloadCsv(`pagos-mattevan-${localDateKey()}.csv`, [['Folio','Cliente','Fecha','Método','Referencia','Importe','Estado'], ...getPaymentRows().map(({ order, payment }) => [order.folio, order.cliente, payment.fecha?.toDate ? payment.fecha.toDate().toLocaleString('es-MX') : '', payment.metodo, payment.nota, payment.monto, payment.cancelado ? 'Cancelado' : 'Aplicado'])]);
}

function renderEncargos() {
    const columns = Object.fromEntries([...document.querySelectorAll('.kanban-column')].map(column => [
        column.dataset.status, column.querySelector('.kanban-col-content')
    ]));
    Object.values(columns).forEach(content => { content.innerHTML = ''; });
    const search = document.getElementById('encargos-search')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('encargos-status-filter')?.value || 'all';
    const filtered = allEncargos.filter(order => {
        const status = normalizeOrderStatus(order.estado);
        const haystack = `${order.folio || ''} ${order.cliente || ''} ${order.telefono || ''} ${order.producto || ''}`.toLowerCase();
        return (!search || haystack.includes(search)) && (statusFilter === 'all' || status === statusFilter);
    });

    filtered.forEach(e => {
        const status = normalizeOrderStatus(e.estado);
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.dataset.id = e.id;
        
        const total = Number(e.total || e.precio || 0);
        const paid = Number(e.pagadoCalculado || 0);
        const saldo = Math.max(0, roundMoney(total - paid));
        const paymentStatus = total > 0 && saldo === 0 ? 'Liquidado' : paid > 0 ? 'Pago parcial' : 'Sin anticipo';
        const isLate = e.fechaEntrega && new Date(`${e.fechaEntrega}T23:59:59`) < new Date() && !['Entregado', 'Cancelado'].includes(status);
        const paymentOverdue = saldo > 0 && e.proximoPago && new Date(`${e.proximoPago}T23:59:59`) < new Date();
        card.innerHTML = `
            <div class="kb-card-header">
                <h4><i class="fa-solid fa-user"></i> ${escapeHtml(e.cliente)}</h4>
                <div class="kb-card-folio">${escapeHtml(e.folio || 'Sin folio')}</div>
            </div>
            <div class="kb-card-body">
                <p><strong>Pide:</strong> ${escapeHtml(e.producto)}</p>
                <div class="kb-card-meta">
                    <span class="kb-chip">📞 ${escapeHtml(e.telefono || 'Sin tel.')}</span>
                    ${e.categoria ? `<span class="kb-chip">${escapeHtml(getCategoryName(e.categoria))}</span>` : ''}
                    ${e.fechaEntrega ? `<span class="kb-chip ${isLate ? 'due-late' : ''}">📅 ${escapeHtml(e.fechaEntrega)}</span>` : ''}
                    ${e.proximoPago ? `<span class="kb-chip ${paymentOverdue ? 'due-late' : ''}">💳 Próximo pago: ${escapeHtml(e.proximoPago)}</span>` : ''}
                    ${total ? `<span class="kb-chip">Total: $${total.toLocaleString('es-MX')}</span><span class="kb-chip">Pagado: $${paid.toLocaleString('es-MX')}</span><span class="kb-chip ${saldo === 0 ? 'paid-off' : ''}">${paymentStatus}: $${saldo.toLocaleString('es-MX')}</span>` : ''}
                </div>
            </div>
            <div class="kb-card-actions">
                ${e.telefono ? `<button class="btn-whatsapp" onclick="contactEncargo('${e.id}')" title="Contactar por WhatsApp" aria-label="Contactar por WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>` : ''}
                <button class="btn-payment" onclick="manageEncargoPayments('${e.id}')" title="Anticipos y abonos" aria-label="Administrar anticipos y abonos"><i class="fa-solid fa-wallet"></i></button>
                ${e.archivo ? `<button onclick="openOrderFile('${e.id}')" title="Ver archivo del cliente" aria-label="Ver archivo del cliente"><i class="fa-solid fa-paperclip"></i></button>` : ''}
                <button onclick="printEncargo('${e.id}')" title="Imprimir cotización" aria-label="Imprimir cotización"><i class="fa-solid fa-file-invoice-dollar"></i></button>
                <button class="btn-edit" onclick="editEncargo('${e.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteEncargo('${e.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        // Eventos Drag and Drop para la tarjeta
        card.addEventListener('dragstart', (evt) => {
            card.classList.add('dragging');
            evt.dataTransfer.setData('text/plain', e.id);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        (columns[status] || columns.Nuevo)?.appendChild(card);
    });

    Object.entries(columns).forEach(([status, content]) => {
        if (!content.children.length) content.innerHTML = `<p class="empty-state" style="padding:10px;">Sin ${status.toLowerCase()}.</p>`;
    });
}

// Configurar zonas para soltar
let kanbanInitialized = false;
function setupKanbanDropZones() {
    if (kanbanInitialized) return;
    
    document.querySelectorAll('.kanban-column').forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', async e => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            const id = e.dataTransfer.getData('text/plain');
            const newStatus = column.dataset.status;
            
            const card = document.querySelector(`.kanban-card[data-id="${id}"]`);
            if (card) {
                const contentArea = column.querySelector('.kanban-col-content');
                contentArea.appendChild(card); // Mover visualmente primero
                
                // Actualizar en Firebase
                try {
                    const enc = allEncargos.find(x => x.id === id);
                    if (newStatus === 'Entregado' && Number(enc?.saldoCalculado || 0) > 0) {
                        if (!enc?.creditoAutorizado) {
                            toast('No se puede entregar: registra el saldo o autoriza crédito', true);
                            window.manageEncargoPayments(id);
                            renderEncargos();
                            return;
                        }
                        if (!confirm(`Se entregará con saldo pendiente de $${Number(enc.saldoCalculado).toLocaleString('es-MX')}. ¿Continuar con crédito autorizado?`)) { renderEncargos(); return; }
                    }
                    if (newStatus === 'Entregado') {
                        await completeOrderDelivery(id);
                        await loadProducts();
                    } else {
                        await updateDoc(doc(db, "encargos", id), { estado: newStatus, actualizadoEn: serverTimestamp() });
                    }
                    
                    // Actualizar estado en memoria
                    if (enc) enc.estado = newStatus;
                    if (enc) await syncTrackingOrders([enc]);
                    
                    renderEncargos();
                    toast('Estado actualizado a ' + newStatus);
                } catch (err) {
                    console.error(err);
                    toast('Error al mover', true);
                    loadEncargos(); // Revertir si falla
                }
            }
        });
    });
    kanbanInitialized = true;
}

function showEncargoForm(encargo = null) {
    const isEdit = !!encargo;
    const currentStatus = normalizeOrderStatus(encargo?.estado);
    const categoryOptions = allCategories.filter(c => c.activa !== false).map(c =>
        `<option value="${escapeHtml(c.slug)}" ${encargo?.categoria === c.slug ? 'selected' : ''}>${escapeHtml(c.icono || '')} ${escapeHtml(c.nombre)}</option>`
    ).join('');
    openModal(isEdit ? 'EDITAR ENCARGO' : 'NUEVO ENCARGO', `
        <form id="ef">
            <div class="form-group"><label>Nombre del Cliente</label><input type="text" id="ef-cliente" required value="${escapeHtml(encargo?.cliente || '')}" placeholder="Ej. Juan Pérez"></div>
            <div class="form-row">
                <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="tel" id="ef-telefono" value="${escapeHtml(encargo?.telefono || '')}" placeholder="Ej. 5512345678"></div>
                <div class="form-group"><label>Categoría</label><select id="ef-categoria"><option value="">Sin categoría</option>${categoryOptions}</select></div>
            </div>
            <div class="form-group"><label>Producto o servicio</label><textarea id="ef-producto" required placeholder="Ej. 20 copias a color, tamaño carta">${escapeHtml(encargo?.producto || '')}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Total (MXN)</label><input type="number" id="ef-total" min="0" step="0.01" value="${Number(encargo?.total || encargo?.precio || 0) || ''}"></div>
                <div class="form-group"><label>${isEdit ? 'Pagado (se modifica en Historial)' : 'Anticipo inicial (MXN)'}</label><input type="number" id="ef-anticipo" min="0" step="0.01" value="${Number(encargo?.pagadoCalculado ?? encargo?.anticipo ?? 0) || ''}" ${isEdit ? 'readonly' : ''}></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Fecha de entrega</label><input type="date" id="ef-fecha-entrega" value="${escapeHtml(encargo?.fechaEntrega || '')}"></div>
                <div class="form-group"><label>Entrega</label><select id="ef-entrega">
                    <option value="Por acordar">Por acordar</option>
                    <option value="Recoger" ${encargo?.tipoEntrega === 'Recoger' ? 'selected' : ''}>Pasar a recoger</option>
                    <option value="Punto medio" ${encargo?.tipoEntrega === 'Punto medio' ? 'selected' : ''}>Punto medio</option>
                    <option value="Envío" ${encargo?.tipoEntrega === 'Envío' ? 'selected' : ''}>Envío</option>
                </select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Acuerdo de pago</label><select id="ef-modalidad-pago">
                    <option value="Contado" ${encargo?.modalidadPago === 'Contado' ? 'selected' : ''}>Pago de contado</option>
                    <option value="Parcialidades" ${encargo?.modalidadPago === 'Parcialidades' ? 'selected' : ''}>Parcialidades</option>
                    <option value="Crédito" ${encargo?.modalidadPago === 'Crédito' ? 'selected' : ''}>Crédito autorizado</option>
                </select></div>
                <div class="form-group"><label>Próximo pago</label><input type="date" id="ef-proximo-pago" value="${escapeHtml(encargo?.proximoPago || '')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Número de parcialidades</label><input type="number" id="ef-parcialidades" min="1" max="60" value="${Number(encargo?.numeroParcialidades || 1)}"></div>
                <div class="form-group"><label>Frecuencia</label><select id="ef-frecuencia">
                    <option value="">No aplica</option><option value="Semanal" ${encargo?.frecuenciaPago === 'Semanal' ? 'selected' : ''}>Semanal</option>
                    <option value="Quincenal" ${encargo?.frecuenciaPago === 'Quincenal' ? 'selected' : ''}>Quincenal</option>
                    <option value="Mensual" ${encargo?.frecuenciaPago === 'Mensual' ? 'selected' : ''}>Mensual</option>
                </select></div>
            </div>
            <div class="form-group"><label><input type="checkbox" id="ef-credito-autorizado" ${encargo?.creditoAutorizado ? 'checked' : ''}> Autorizar entrega aunque exista saldo pendiente</label></div>
            <div class="form-group"><label>Notas internas</label><textarea id="ef-notas" placeholder="Diseño, materiales, medidas o acuerdos">${escapeHtml(encargo?.notas || '')}</textarea></div>
            <div class="form-group"><label>Estado</label>
                <select id="ef-estado">
                    <option value="Nuevo" ${currentStatus === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                    <option value="Cotizado" ${currentStatus === 'Cotizado' ? 'selected' : ''}>Cotizado</option>
                    <option value="Produccion" ${currentStatus === 'Produccion' ? 'selected' : ''}>En producción</option>
                    <option value="Listo" ${currentStatus === 'Listo' ? 'selected' : ''}>Listo para entregar</option>
                    <option value="Entregado" ${currentStatus === 'Entregado' ? 'selected' : ''}>Entregado</option>
                    <option value="Cancelado" ${currentStatus === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </div>
            <button type="submit" class="btn-primary w-100 mt-2">${isEdit ? 'Guardar Cambios' : 'Crear Encargo'}</button>
        </form>
    `);

    document.getElementById('ef').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        
        try {
            const data = {
                cliente: document.getElementById('ef-cliente').value.trim(),
                producto: document.getElementById('ef-producto').value.trim(),
                telefono: document.getElementById('ef-telefono').value.trim(),
                categoria: document.getElementById('ef-categoria').value,
                total: Number(document.getElementById('ef-total').value) || 0,
                fechaEntrega: document.getElementById('ef-fecha-entrega').value,
                tipoEntrega: document.getElementById('ef-entrega').value,
                modalidadPago: document.getElementById('ef-modalidad-pago').value,
                proximoPago: document.getElementById('ef-proximo-pago').value,
                numeroParcialidades: Number(document.getElementById('ef-parcialidades').value) || 1,
                frecuenciaPago: document.getElementById('ef-frecuencia').value,
                creditoAutorizado: document.getElementById('ef-credito-autorizado').checked,
                notas: document.getElementById('ef-notas').value.trim(),
                estado: document.getElementById('ef-estado').value,
                actualizadoEn: serverTimestamp()
            };
            const initialPayment = Number(document.getElementById('ef-anticipo').value) || 0;
            if (initialPayment > data.total) throw new Error('El pago no puede ser mayor que el total.');
            if (isEdit && Number(encargo.pagadoCalculado || 0) > data.total) throw new Error('El total no puede ser menor que lo ya pagado.');
            if (isEdit) {
                const wantsDelivery = data.estado === 'Entregado';
                const resultingBalance = Math.max(0, roundMoney(data.total - Number(encargo.pagadoCalculado || 0)));
                if (wantsDelivery && resultingBalance > 0 && !data.creditoAutorizado) throw new Error('No puedes entregar con saldo pendiente sin autorizar crédito.');
                if (wantsDelivery && resultingBalance > 0 && !confirm(`¿Entregar con crédito y saldo pendiente de $${resultingBalance.toLocaleString('es-MX')}?`)) throw new Error('Entrega cancelada.');
                if (wantsDelivery) data.estado = normalizeOrderStatus(encargo.estado);
                await updateDoc(doc(db, "encargos", encargo.id), data);
                if (wantsDelivery) { await completeOrderDelivery(encargo.id); await loadProducts(); }
                toast('Encargo actualizado ✅');
            } else {
                data.folio = createOrderFolio();
                data.origen = 'Administrador';
                data.creadoEn = serverTimestamp();
                data.anticipo = initialPayment;
                data.pagado = initialPayment;
                data.saldo = Math.max(0, roundMoney(data.total - initialPayment));
                data.estadoPago = data.total > 0 && data.saldo === 0 ? 'Liquidado' : initialPayment > 0 ? 'Pago parcial' : 'Sin anticipo';
                const orderRef = doc(collection(db, "encargos"));
                const batch = writeBatch(db);
                batch.set(orderRef, data);
                if (initialPayment > 0) {
                    const paymentRef = doc(collection(db, "encargos", orderRef.id, "pagos"));
                    batch.set(paymentRef, { monto: initialPayment, metodo: 'No especificado', nota: 'Anticipo inicial', fecha: serverTimestamp() });
                }
                await batch.commit();
                toast('Encargo creado ✅');
            }
            closeModal();
            await loadEncargos();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
            toast('Error al guardar', true);
            btn.disabled = false; btn.innerText = 'Intentar de nuevo';
        }
    });
}

window.editEncargo = function(id) { const e = allEncargos.find(x => x.id === id); if (e) showEncargoForm(e); };
window.openOrderFile = function(id) {
    const order = allEncargos.find(item => item.id === id);
    if (!order?.archivo) return;
    const fileWindow = window.open();
    if (fileWindow) fileWindow.location.href = order.archivo;
};
window.manageEncargoPayments = function(id) {
    const order = allEncargos.find(item => item.id === id);
    if (!order) return;
    const total = Number(order.total || order.precio || 0);
    const paid = Number(order.pagadoCalculado || 0);
    const balance = Math.max(0, roundMoney(total - paid));
    const legacyPayment = order.pagos.length === 0 && paid > 0;
    const paymentRows = [
        ...(legacyPayment ? [{ id: '', monto: paid, metodo: 'No especificado', nota: 'Anticipo registrado anteriormente', legacy: true }] : []),
        ...order.pagos
    ].map(payment => {
        const date = payment.fecha?.toDate ? payment.fecha.toDate().toLocaleString('es-MX') : payment.legacy ? 'Registro anterior' : 'Fecha pendiente';
        return `<div class="payment-row ${payment.cancelado ? 'payment-cancelled' : ''}">
            <div><strong>${escapeHtml(payment.metodo || 'No especificado')}</strong><small>${escapeHtml(payment.nota || 'Sin nota')} · ${escapeHtml(date)}</small></div>
            <span class="payment-amount">${payment.cancelado ? 'Cancelado' : '+' + '$' + Number(payment.monto || 0).toLocaleString('es-MX')}</span>
            <span class="payment-actions">${payment.legacy ? '<span title="Se migrará al registrar el siguiente pago">Histórico</span>' : `<button type="button" onclick="printPaymentReceipt('${order.id}','${payment.id}')" title="Imprimir recibo" aria-label="Imprimir recibo"><i class="fa-solid fa-receipt"></i></button>${payment.cancelado ? '' : `<button type="button" onclick="cancelEncargoPayment('${order.id}','${payment.id}')" title="Cancelar movimiento" aria-label="Cancelar movimiento"><i class="fa-solid fa-ban"></i></button>`}`}</span>
        </div>`;
    }).join('');

    openModal(`PAGOS · ${order.folio || order.cliente}`, `
        <div class="payments-summary">
            <div class="payment-summary-card"><span>Total</span><strong>$${total.toLocaleString('es-MX')}</strong></div>
            <div class="payment-summary-card"><span>Pagado</span><strong>$${paid.toLocaleString('es-MX')}</strong></div>
            <div class="payment-summary-card"><span>Saldo</span><strong>$${balance.toLocaleString('es-MX')}</strong></div>
        </div>
        <h3>Historial de movimientos</h3>
        <div class="payments-list">${paymentRows || '<p class="empty-state">Aún no hay anticipos ni abonos.</p>'}</div>
        ${total > 0 && balance > 0 ? `<form id="payment-form">
            <div class="form-row">
                <div class="form-group"><label>Importe del abono</label><input type="number" id="payment-amount" min="0.01" max="${balance}" step="0.01" required></div>
                <div class="form-group"><label>Método</label><select id="payment-method">
                    <option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option><option value="Depósito">Depósito</option><option value="Otro">Otro</option>
                </select></div>
            </div>
            <div class="form-group"><label>Nota o referencia</label><input type="text" id="payment-note" maxlength="200" placeholder="Ej. Transferencia 4582"></div>
            <button type="submit" class="beast-btn" style="width:100%"><i class="fa-solid fa-plus"></i> Registrar abono</button>
        </form>` : total > 0 ? '<p class="payment-liquidated">✅ Pedido liquidado. El historial se conserva.</p>' : '<p class="empty-state">Define primero el total del pedido para registrar pagos.</p>'}
    `);

    document.getElementById('payment-form')?.addEventListener('submit', async event => {
        event.preventDefault();
        const button = event.target.querySelector('button[type="submit"]');
        const amount = Number(document.getElementById('payment-amount').value);
        if (!amount || amount <= 0 || amount > balance) { toast('El importe no es válido', true); return; }
        button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';
        try {
            const batch = writeBatch(db);
            if (legacyPayment) {
                const legacyRef = doc(collection(db, "encargos", order.id, "pagos"));
                batch.set(legacyRef, { monto: paid, metodo: 'No especificado', nota: 'Anticipo migrado del registro anterior', fecha: serverTimestamp() });
            }
            const paymentRef = doc(collection(db, "encargos", order.id, "pagos"));
            batch.set(paymentRef, {
                monto: amount,
                metodo: document.getElementById('payment-method').value,
                nota: document.getElementById('payment-note').value.trim(),
                fecha: serverTimestamp()
            });
            const newPaid = roundMoney(paid + amount);
            const newBalance = Math.max(0, roundMoney(total - newPaid));
            batch.update(doc(db, "encargos", order.id), {
                pagado: newPaid, anticipo: newPaid, saldo: newBalance,
                estadoPago: newBalance === 0 ? 'Liquidado' : 'Pago parcial',
                proximoPago: newBalance === 0 ? '' : calculateNextPaymentDate(order.proximoPago, order.frecuenciaPago),
                actualizadoEn: serverTimestamp()
            });
            await batch.commit();
            toast(newBalance === 0 ? 'Pedido liquidado ✅' : 'Abono registrado ✅');
            await loadEncargos();
            window.manageEncargoPayments(order.id);
            updateDashboard();
        } catch (error) {
            console.error(error); toast('No se pudo registrar el abono', true);
            button.disabled = false; button.textContent = 'Intentar de nuevo';
        }
    });
};

window.cancelEncargoPayment = async function(orderId, paymentId) {
    const order = allEncargos.find(item => item.id === orderId);
    const payment = order?.pagos.find(item => item.id === paymentId);
    if (!order || !payment) return;
    const reason = prompt(`Motivo para cancelar el pago de $${Number(payment.monto).toLocaleString('es-MX')}:`);
    if (!reason?.trim()) return;
    try {
        const total = Number(order.total || order.precio || 0);
        const newPaid = Math.max(0, roundMoney(Number(order.pagadoCalculado || 0) - Number(payment.monto || 0)));
        const newBalance = Math.max(0, roundMoney(total - newPaid));
        const batch = writeBatch(db);
        batch.update(doc(db, "encargos", orderId, "pagos", paymentId), {
            cancelado: true, motivoCancelacion: reason.trim(), canceladoEn: serverTimestamp()
        });
        batch.update(doc(db, "encargos", orderId), {
            pagado: newPaid, anticipo: newPaid, saldo: newBalance,
            estadoPago: newPaid === 0 ? 'Sin anticipo' : newBalance === 0 ? 'Liquidado' : 'Pago parcial', actualizadoEn: serverTimestamp()
        });
        await batch.commit();
        toast('Movimiento cancelado y conservado en auditoría');
        await loadEncargos(); window.manageEncargoPayments(orderId); updateDashboard();
    } catch (error) { console.error(error); toast('No se pudo eliminar el movimiento', true); }
};

window.printPaymentReceipt = function(orderId, paymentId) {
    const order = allEncargos.find(item => item.id === orderId);
    const payment = order?.pagos.find(item => item.id === paymentId);
    if (!order || !payment) return;
    const paymentsBefore = order.pagos.filter(item => !item.cancelado && (item.fecha?.seconds || 0) <= (payment.fecha?.seconds || 0));
    const paidAfter = roundMoney(paymentsBefore.reduce((sum, item) => sum + Number(item.monto || 0), 0));
    const total = Number(order.total || 0);
    const paidBefore = Math.max(0, roundMoney(paidAfter - Number(payment.monto || 0)));
    const receiptWindow = window.open('', '_blank', 'width=620,height=760');
    if (!receiptWindow) { toast('Permite ventanas emergentes para imprimir', true); return; }
    receiptWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo ${escapeHtml(order.folio || '')}</title><style>body{font-family:Arial;margin:40px;color:#222}header{border-bottom:4px solid #00bcd4;margin-bottom:25px}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #ddd}td:last-child{text-align:right;font-weight:bold}@media print{button{display:none}}</style></head><body>
        <header><h1>mattEvan</h1><p>Recibo de pago · ${escapeHtml(order.folio || '')}</p></header><p><strong>Cliente:</strong> ${escapeHtml(order.cliente)}</p>
        <table><tr><td>Saldo anterior</td><td>$${Math.max(0, total - paidBefore).toLocaleString('es-MX')}</td></tr><tr><td>Pago recibido (${escapeHtml(payment.metodo || '')})</td><td>$${Number(payment.monto).toLocaleString('es-MX')}</td></tr><tr><td>Nuevo saldo</td><td>$${Math.max(0, total - paidAfter).toLocaleString('es-MX')}</td></tr></table>
        <p><strong>Referencia:</strong> ${escapeHtml(payment.nota || 'Sin referencia')}</p><p>Fecha: ${escapeHtml(payment.fecha?.toDate ? payment.fecha.toDate().toLocaleString('es-MX') : new Date().toLocaleString('es-MX'))}</p>
        <button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`);
    receiptWindow.document.close();
};

window.contactEncargo = function(id) {
    const order = allEncargos.find(x => x.id === id);
    if (!order?.telefono) return;
    const phone = order.telefono.replace(/\D/g, '');
    const status = normalizeOrderStatus(order.estado);
    const overduePayment = Number(order.saldoCalculado || 0) > 0 && order.proximoPago && order.proximoPago < localDateKey();
    const messages = {
        Nuevo: `Hola ${order.cliente}, recibimos tu pedido ${order.folio || ''} en mattEvan. En breve lo revisaremos.`,
        Cotizado: `Hola ${order.cliente}, la cotización de tu pedido ${order.folio || ''} está lista. Total: $${Number(order.total || 0).toLocaleString('es-MX')} MXN.`,
        Produccion: `Hola ${order.cliente}, tu pedido ${order.folio || ''} ya está en producción.`,
        Listo: `Hola ${order.cliente}, tu pedido ${order.folio || ''} de mattEvan ya está listo para entregar. Saldo: $${Number(order.saldoCalculado || 0).toLocaleString('es-MX')} MXN.`,
        Entregado: `Hola ${order.cliente}, gracias por tu compra. Tu pedido ${order.folio || ''} fue entregado.`,
        Cancelado: `Hola ${order.cliente}, te contactamos sobre la cancelación del pedido ${order.folio || ''}.`
    };
    const message = overduePayment
        ? `Hola ${order.cliente}, te recordamos que el pago de tu pedido ${order.folio || ''} está pendiente. Saldo: $${Number(order.saldoCalculado).toLocaleString('es-MX')} MXN. Fecha acordada: ${order.proximoPago}.`
        : messages[status] || `Hola ${order.cliente}, te contactamos de mattEvan sobre tu pedido ${order.folio || ''}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};
window.printEncargo = function(id) {
    const order = allEncargos.find(x => x.id === id);
    if (!order) return;
    const total = Number(order.total || 0);
    const advance = Number(order.pagadoCalculado ?? order.pagado ?? order.anticipo ?? 0);
    const paymentHistory = (order.pagos || []).map(payment => `<tr><td>${escapeHtml(payment.metodo || 'Pago')}<br><small>${escapeHtml(payment.nota || '')}</small></td><td class="money">$${Number(payment.monto || 0).toLocaleString('es-MX')} MXN</td></tr>`).join('');
    const printWindow = window.open('', '_blank', 'width=760,height=820');
    if (!printWindow) { toast('Permite ventanas emergentes para imprimir', true); return; }
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(order.folio || 'Cotización')}</title>
        <style>body{font-family:Arial,sans-serif;color:#222;margin:40px}header{border-bottom:4px solid #00bcd4;padding-bottom:16px;margin-bottom:24px}h1{margin:0}table{width:100%;border-collapse:collapse;margin:24px 0}td{padding:10px;border-bottom:1px solid #ddd}.money{text-align:right;font-weight:bold}.total{font-size:1.2rem}footer{margin-top:50px;color:#666;font-size:.85rem}@media print{button{display:none}}</style></head><body>
        <header><h1>mattEvan</h1><p>Cotización / Pedido <strong>${escapeHtml(order.folio || '')}</strong></p></header>
        <p><strong>Cliente:</strong> ${escapeHtml(order.cliente)}</p><p><strong>Teléfono:</strong> ${escapeHtml(order.telefono || '')}</p>
        <table><tr><td>${escapeHtml(order.producto)}</td><td class="money">$${total.toLocaleString('es-MX')} MXN</td></tr>
        ${paymentHistory || `<tr><td>Pagado / anticipo</td><td class="money">$${advance.toLocaleString('es-MX')} MXN</td></tr>`}
        <tr class="total"><td>Saldo pendiente</td><td class="money">$${Math.max(0, total - advance).toLocaleString('es-MX')} MXN</td></tr></table>
        ${order.fechaEntrega ? `<p><strong>Entrega estimada:</strong> ${escapeHtml(order.fechaEntrega)}</p>` : ''}
        <footer>Gracias por confiar en mattEvan. Los tiempos comienzan después de confirmar diseño y anticipo.</footer>
        <button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`);
    printWindow.document.close();
};
window.deleteEncargo = async function(id) {
    if (!confirm('¿Eliminar este encargo?')) return;
    try {
        const order = allEncargos.find(item => item.id === id);
        const batch = writeBatch(db);
        (order?.pagos || []).forEach(payment => batch.delete(doc(db, "encargos", id, "pagos", payment.id)));
        batch.delete(doc(db, "encargos", id));
        await batch.commit(); toast('Encargo eliminado 🗑️'); await loadEncargos();
    } catch (err) {
        console.error(err);
        alert('Error exacto: ' + err.message);
        toast('Error', true); 
    }
};

// ======================================================
//  NOVEDADES
// ======================================================
let allNovedades = [];
document.getElementById('add-novedad-btn').addEventListener('click', () => showNovedadForm());

async function loadNovedades() {
    const list = document.getElementById('admin-novedades-list');
    list.innerHTML = '<p class="loading-text">Cargando...</p>';
    const snap = await getDocs(collection(db, "novedades"));
    allNovedades = [];
    snap.forEach(d => allNovedades.push({ id: d.id, ...d.data() }));

    if (allNovedades.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay novedades. Agrega las noticias de la semana.</p>';
        return;
    }

    list.innerHTML = allNovedades.map(n => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${escapeHtml(n.titulo)} ${n.destacada ? '<span class="badge-highlight">⭐ Destacada</span>' : ''}</h4>
                <p>${escapeHtml(n.descripcion)}</p>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editNovedad('${n.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteNovedad('${n.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function showNovedadForm(nov = null) {
    const isEdit = !!nov;
    openModal(isEdit ? 'EDITAR NOVEDAD' : 'NUEVA NOVEDAD', `
        <form id="nf">
            <div class="form-group"><label>Título</label><input type="text" id="nf-title" required value="${nov?.titulo || ''}"></div>
            <div class="form-group"><label>Descripción</label><textarea id="nf-desc" required>${nov?.descripcion || ''}</textarea></div>
            <div class="form-group"><label>Imagen (Opcional)</label><input type="file" id="nf-img" accept="image/*">
                ${nov?.imagen ? `<img src="${nov.imagen}" class="img-preview" style="max-height:100px; margin-top:10px; border-radius:5px;">` : ''}
            </div>
            <div class="form-group"><label><input type="checkbox" id="nf-highlight" ${nov?.destacada ? 'checked' : ''}> Marcar como destacada</label></div>
            <button type="submit" class="beast-btn" style="width:100%">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'} 🆕</button>
        </form>
    `);
    document.getElementById('nf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
        const data = { titulo: document.getElementById('nf-title').value, descripcion: document.getElementById('nf-desc').value, destacada: document.getElementById('nf-highlight').checked };
        
        const fileInput = document.getElementById('nf-img');
        if (fileInput.files.length > 0) {
            data.imagen = await fileToBase64(fileInput.files[0]);
        } else if (isEdit && nov.imagen) {
            data.imagen = nov.imagen;
        }

            if (isEdit) {
                await updateDoc(doc(db, "novedades", nov.id), data);
                toast('Novedad actualizada ✅');
            }
            else { await addDoc(collection(db, "novedades"), data); toast('Novedad creada ✅'); }
            closeModal(); await loadNovedades();
        } catch (err) { console.error(err); toast(err.message || 'Error', true); btn.disabled = false; btn.textContent = 'Intentar de nuevo'; }
    });
}

window.editNovedad = function(id) { const n = allNovedades.find(x => x.id === id); if (n) showNovedadForm(n); };
window.deleteNovedad = async function(id) {
    if (!confirm('¿Eliminar esta novedad?')) return;
    try {
        await deleteDoc(doc(db, "novedades", id));
        toast('Novedad eliminada 🗑️'); await loadNovedades();
    } catch (err) {
        console.error(err);
        alert('Error exacto: ' + err.message);
        toast('Error', true); 
    }
};

// ======================================================
//  PROMOCIONES
// ======================================================
let allPromos = [];
document.getElementById('add-promo-btn').addEventListener('click', () => showPromoForm());

async function loadPromos() {
    const list = document.getElementById('admin-promos-list');
    list.innerHTML = '<p class="loading-text">Cargando...</p>';
    const snap = await getDocs(collection(db, "promociones"));
    allPromos = [];
    snap.forEach(d => allPromos.push({ id: d.id, ...d.data() }));

    if (allPromos.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay promociones activas.</p>';
        return;
    }

    list.innerHTML = allPromos.map(p => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${escapeHtml(p.titulo)} ${p.activa ? '<span class="badge-active">Activa</span>' : '<span class="badge-inactive">Inactiva</span>'}</h4>
                <p>${escapeHtml(p.texto)}</p>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editPromo('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deletePromo('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function showPromoForm(promo = null) {
    const isEdit = !!promo;
    openModal(isEdit ? 'EDITAR PROMOCIÓN' : 'NUEVA PROMOCIÓN', `
        <form id="prf">
            <div class="form-group"><label>Título (ej. 💼 ¿Buscas empleo?)</label><input type="text" id="prf-title" required value="${promo?.titulo || ''}"></div>
            <div class="form-group"><label>Texto</label><textarea id="prf-text" required>${promo?.texto || ''}</textarea></div>
            <div class="form-group"><label>Imagen de Fondo (Opcional)</label><input type="file" id="prf-img" accept="image/*">
                ${promo?.imagen ? `<img src="${promo.imagen}" class="img-preview" style="max-height:100px; margin-top:10px; border-radius:5px;">` : ''}
            </div>
            <div class="form-group"><label><input type="checkbox" id="prf-active" ${promo?.activa !== false ? 'checked' : ''}> Promoción activa (visible en la página)</label></div>
            <button type="submit" class="beast-btn" style="width:100%">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'} 🎯</button>
        </form>
    `);
    document.getElementById('prf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
        const data = { titulo: document.getElementById('prf-title').value, texto: document.getElementById('prf-text').value, activa: document.getElementById('prf-active').checked };
        
        const fileInput = document.getElementById('prf-img');
        if (fileInput.files.length > 0) {
            data.imagen = await fileToBase64(fileInput.files[0]);
        } else if (isEdit && promo.imagen) {
            data.imagen = promo.imagen;
        }

            if (isEdit) {
                await updateDoc(doc(db, "promociones", promo.id), data);
                toast('Promoción actualizada ✅');
            }
            else { await addDoc(collection(db, "promociones"), data); toast('Promoción creada ✅'); }
            closeModal(); await loadPromos();
        } catch (err) { console.error(err); toast(err.message || 'Error', true); btn.disabled = false; btn.textContent = 'Intentar de nuevo'; }
    });
}

window.editPromo = function(id) { const p = allPromos.find(x => x.id === id); if (p) showPromoForm(p); };
window.deletePromo = async function(id) {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
        await deleteDoc(doc(db, "promociones", id));
        toast('Promoción eliminada 🗑️'); await loadPromos();
    } catch (err) {
        console.error(err);
        alert('Error exacto: ' + err.message);
        toast('Error', true); 
    }
};

// ======================================================
//  GALERÍA
// ======================================================
let allGallery = [];
document.getElementById('add-gallery-btn').addEventListener('click', () => showGalleryForm());

async function loadGallery() {
    const list = document.getElementById('admin-gallery-list');
    list.innerHTML = '<p class="loading-text">Cargando...</p>';
    const snap = await getDocs(collection(db, "galeria"));
    allGallery = [];
    snap.forEach(d => allGallery.push({ id: d.id, ...d.data() }));

    if (allGallery.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay imágenes en la galería.</p>';
        return;
    }

    list.innerHTML = allGallery.map(g => `
        <div class="gallery-admin-item">
            <img src="${g.imagen}" alt="${g.alt || 'Galería'}">
            <div class="gallery-overlay">
                <button onclick="deleteGalleryItem('${g.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </div>
        </div>
    `).join('');
}

function showGalleryForm() {
    openModal('SUBIR IMAGEN A GALERÍA', `
        <form id="gf">
            <div class="form-group"><label>Descripción de la imagen</label><input type="text" id="gf-alt" required placeholder="Ej. Tazas personalizadas"></div>
            <div class="form-group"><label>Archivo (Imagen)</label><input type="file" id="gf-img" accept="image/*" required></div>
            <button type="submit" class="beast-btn" style="width:100%">SUBIR IMAGEN 📸</button>
        </form>
    `);
    document.getElementById('gf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
        try {
            const file = document.getElementById('gf-img').files[0];
            const base64Data = await fileToBase64(file);
            await addDoc(collection(db, "galeria"), { imagen: base64Data, alt: document.getElementById('gf-alt').value });
            toast('Imagen subida ✅');
            closeModal(); await loadGallery(); updateDashboard();
        } catch (err) { toast('Error al subir imagen', true); }
    });
}

window.deleteGalleryItem = async function(id) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
        await deleteDoc(doc(db, "galeria", id));
        toast('Imagen eliminada 🗑️'); await loadGallery(); updateDashboard();
    } catch (err) {
        console.error(err);
        alert('Error exacto: ' + err.message);
        toast('Error', true); 
    }
};

// ======================================================
//  CONFIGURACIÓN (Links)
// ======================================================
async function loadConfig() {
    try {
        const docSnap = await getDoc(doc(db, "configuracion", "general"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('cfg-whatsapp').value = data.whatsappNumber || '';
            document.getElementById('cfg-facebook').value = data.facebookUrl || '';
            document.getElementById('cfg-instagram').value = data.instagramUrl || '';
        }
    } catch (err) { console.error('Error loading config:', err); }
}

document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "configuracion", "general"), {
            whatsappNumber: document.getElementById('cfg-whatsapp').value,
            facebookUrl: document.getElementById('cfg-facebook').value,
            instagramUrl: document.getElementById('cfg-instagram').value,
        });
        toast('Configuración guardada ✅');
    } catch (err) { toast('Error al guardar', true); }
});

// ======================================================
//  DASHBOARD METRICS
// ======================================================
function updateDashboard() {
    const total = allProducts.length;
    const disponibles = allProducts.filter(p => p.estado === 'Disponible' || !p.estado).length;
    const vendidos = allProducts.filter(p => p.estado === 'Vendido').length;
    let ingresos = 0;
    allProducts.forEach(p => {
        if (p.estado === 'Vendido' && p.precio) {
            ingresos += p.precio;
        }
    });
    const activeOrders = allEncargos.filter(e => !['Entregado', 'Cancelado'].includes(normalizeOrderStatus(e.estado)));
    const readyOrders = allEncargos.filter(e => normalizeOrderStatus(e.estado) === 'Listo');
    const ordersPaymentsIncome = allEncargos.reduce((sum, e) => sum + Number(e.pagadoCalculado || 0), 0);
    const pendingBalances = activeOrders.reduce((sum, e) => sum + Number(e.saldoCalculado ?? Math.max(0, Number(e.total || 0) - Number(e.anticipo || 0))), 0);
    ingresos += ordersPaymentsIncome;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-disponibles').innerText = disponibles;
    document.getElementById('stat-vendidos').innerText = vendidos;
    document.getElementById('stat-galeria').innerText = allGallery.length;
    document.getElementById('stat-ingresos').innerText = `$${ingresos.toLocaleString('es-MX')}`;
    document.getElementById('stat-pedidos-activos').innerText = activeOrders.length;
    document.getElementById('stat-pedidos-listos').innerText = readyOrders.length;
    document.getElementById('stat-saldos').innerText = `$${pendingBalances.toLocaleString('es-MX')}`;

    // Category breakdown
    const breakdown = document.getElementById('cat-breakdown');
    const catsToUse = allCategories;
    breakdown.innerHTML = catsToUse.map(c => {
        const count = allProducts.filter(p => p.categoria === c.slug).length;
        return `<div class="cat-row"><span class="cat-name">${escapeHtml(c.icono || '')} ${escapeHtml(c.nombre)}</span><span class="cat-count">${count}</span></div>`;
    }).join('');
}

// Convierte archivos a Base64 para guardarlos directamente en Firestore.
// Las imágenes se reducen para mantener cada documento por debajo del límite de 1 MB.
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) { reject(new Error('Selecciona un archivo.')); return; }

        if (!file.type.startsWith('image/')) {
            if (file.size > 700 * 1024) {
                reject(new Error('El PDF no puede superar 700 KB al guardarse en Firestore.'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
            reader.readAsDataURL(file);
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.src = objectUrl;
        image.onload = () => {
            const maxSize = 900;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            const base64 = canvas.toDataURL('image/jpeg', 0.72);
            if (base64.length > 900000) {
                reject(new Error('La imagen sigue siendo demasiado grande. Usa una imagen más ligera.'));
                return;
            }
            resolve(base64);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo procesar la imagen.'));
        };
    });
}
