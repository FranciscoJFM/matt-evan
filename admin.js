// ============================================
// MATTEVAN ADMIN - FIREBASE COMPLETO
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
}
function closeModal() { modal.classList.remove('active'); }
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

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
    await Promise.all([
        loadProducts(),
        loadCategories(),
        loadEncargos(),
        loadNovedades(),
        loadPromos(),
        loadGallery(),
        loadConfig()
    ]);
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
        return `
        <div class="product-card" style="${soldStyle}">
            <img src="${imgUrl}" alt="${p.nombre}">
            <div class="product-card-body">
                <span class="badge ${badgeClass}">${p.estado || 'Disponible'}</span>
                ${stockLabel}
                <h3>${p.nombre}</h3>
                <p class="price">$${p.precio} MXN</p>
                <p class="cat-label">${p.categoria || 'Sin categoría'}</p>
                <div class="card-actions">
                    <button class="btn-edit" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function showProductForm(product = null) {
    const isEdit = !!product;
    
    // Si no hay categorías creadas, usamos las base por defecto
    let catsToUse = allCategories;
    if (catsToUse.length === 0) {
        catsToUse = [
            { nombre: 'Garage / Bazar', slug: 'garage' },
            { nombre: 'Personalizados', slug: 'custom' },
            { nombre: 'Copias e Impresiones', slug: 'impresiones' },
            { nombre: 'Papelería', slug: 'papeleria' }
        ];
    }
    
    const catOptions = catsToUse.map(c => `<option value="${c.slug}" ${product && product.categoria === c.slug ? 'selected' : ''}>${c.nombre}</option>`).join('');

    openModal(isEdit ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO', `
        <form id="pf">
            <div class="form-group"><label>Nombre</label><input type="text" id="pf-name" required value="${product?.nombre || ''}" placeholder="Ej. Camiseta Mattevan"></div>
            <div class="form-row">
                <div class="form-group"><label>Precio (MXN)</label><input type="number" id="pf-price" required value="${product?.precio || ''}" placeholder="250"></div>
                <div class="form-group"><label>Cantidad en stock</label><input type="number" id="pf-qty" min="0" value="${product?.cantidad ?? 1}" placeholder="1"></div>
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
            const data = {
                nombre: document.getElementById('pf-name').value,
                precio: Number(document.getElementById('pf-price').value),
                cantidad: Number(document.getElementById('pf-qty').value) || 1,
                categoria: document.getElementById('pf-cat').value,
                estado: document.getElementById('pf-status').value,
                descripcion: document.getElementById('pf-desc').value,
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
//  CATEGORÍAS
// ======================================================
document.getElementById('add-category-btn').addEventListener('click', () => showCategoryForm());

async function loadCategories() {
    const list = document.getElementById('admin-categories-list');
    list.innerHTML = '<p class="loading-text">Cargando...</p>';
    const snap = await getDocs(collection(db, "categorias"));
    allCategories = [];
    snap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));

    if (allCategories.length === 0) {
        list.innerHTML = '<p class="empty-state">No hay categorías. Agrega las que necesites.</p>';
        return;
    }

    list.innerHTML = allCategories.map(c => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${c.nombre} <span style="color:var(--text-muted);font-size:.8rem;">(${c.slug})</span></h4>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editCategory('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteCategory('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function showCategoryForm(cat = null) {
    const isEdit = !!cat;
    openModal(isEdit ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA', `
        <form id="cf">
            <div class="form-group"><label>Nombre (ej. Garage / Bazar)</label><input type="text" id="cf-name" required value="${cat?.nombre || ''}"></div>
            <div class="form-group"><label>Slug (identificador, ej. garage)</label><input type="text" id="cf-slug" required value="${cat?.slug || ''}" placeholder="solo letras minúsculas"></div>
            <button type="submit" class="beast-btn" style="width:100%">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'} 🏷️</button>
        </form>
    `);
    document.getElementById('cf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { nombre: document.getElementById('cf-name').value, slug: document.getElementById('cf-slug').value.toLowerCase() };
        try {
            if (isEdit) { await updateDoc(doc(db, "categorias", cat.id), data); toast('Categoría actualizada ✅'); }
            else { await addDoc(collection(db, "categorias"), data); toast('Categoría creada ✅'); }
            closeModal();
            await loadCategories();
        } catch (err) { toast('Error', true); }
    });
}

window.editCategory = function(id) { const c = allCategories.find(x => x.id === id); if (c) showCategoryForm(c); };
window.deleteCategory = async function(id) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try { await deleteDoc(doc(db, "categorias", id)); toast('Categoría eliminada 🗑️'); await loadCategories(); } catch (err) { 
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

async function loadEncargos() {
    const list = document.getElementById('admin-encargos-list');
    list.innerHTML = '<p class="loading-text">Cargando encargos...</p>';
    const snap = await getDocs(collection(db, "encargos"));
    allEncargos = [];
    snap.forEach(d => allEncargos.push({ id: d.id, ...d.data() }));

    if (allEncargos.length === 0) {
        list.innerHTML = '<p class="empty-state">No tienes encargos pendientes.</p>';
        return;
    }

    list.innerHTML = allEncargos.map(e => {
        let badgeClass = 'badge-disponible';
        if (e.estado === 'Entregado') badgeClass = 'badge-apartado';
        if (e.estado === 'Cancelado') badgeClass = 'badge-vendido';
        if (e.estado === 'Conseguido') badgeClass = 'badge-disponible';

        return `
        <div class="list-item" style="${e.estado === 'Entregado' || e.estado === 'Cancelado' ? 'opacity:0.6' : ''}">
            <div class="list-item-info">
                <h4><i class="fa-solid fa-user"></i> ${e.cliente}</h4>
                <p><strong>Pide:</strong> ${e.producto}</p>
                <p>📞 ${e.telefono || 'Sin teléfono'}</p>
                <span class="badge ${badgeClass}" style="margin-top:5px;display:inline-block">${e.estado || 'Pendiente'}</span>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editEncargo('${e.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" onclick="deleteEncargo('${e.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
        `;
    }).join('');
}

function showEncargoForm(encargo = null) {
    const isEdit = !!encargo;
    openModal(isEdit ? 'EDITAR ENCARGO' : 'NUEVO ENCARGO', `
        <form id="ef">
            <div class="form-group"><label>Nombre del Cliente</label><input type="text" id="ef-cliente" required value="${encargo?.cliente || ''}" placeholder="Ej. Juan Pérez"></div>
            <div class="form-group"><label>¿Qué producto busca?</label><input type="text" id="ef-producto" required value="${encargo?.producto || ''}" placeholder="Ej. Play 2 con 2 controles"></div>
            <div class="form-group"><label>Teléfono (WhatsApp)</label><input type="text" id="ef-telefono" value="${encargo?.telefono || ''}" placeholder="Ej. 5512345678"></div>
            <div class="form-group"><label>Estado</label>
                <select id="ef-estado">
                    <option value="Pendiente" ${encargo?.estado === 'Pendiente' ? 'selected' : ''}>Pendiente (Buscándolo)</option>
                    <option value="Conseguido" ${encargo?.estado === 'Conseguido' ? 'selected' : ''}>Conseguido (Listo para entregar)</option>
                    <option value="Entregado" ${encargo?.estado === 'Entregado' ? 'selected' : ''}>Entregado (Finalizado)</option>
                    <option value="Cancelado" ${encargo?.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
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
                cliente: document.getElementById('ef-cliente').value,
                producto: document.getElementById('ef-producto').value,
                telefono: document.getElementById('ef-telefono').value,
                estado: document.getElementById('ef-estado').value
            };
            if (isEdit) {
                await updateDoc(doc(db, "encargos", encargo.id), data);
                toast('Encargo actualizado ✅');
            } else {
                await addDoc(collection(db, "encargos"), data);
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
window.deleteEncargo = async function(id) {
    if (!confirm('¿Eliminar este encargo?')) return;
    try { await deleteDoc(doc(db, "encargos", id)); toast('Encargo eliminado 🗑️'); await loadEncargos(); } catch (err) { 
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
                <h4>${n.titulo} ${n.destacada ? '<span class="badge-highlight">⭐ Destacada</span>' : ''}</h4>
                <p>${n.descripcion}</p>
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

        const data = { titulo: document.getElementById('nf-title').value, descripcion: document.getElementById('nf-desc').value, destacada: document.getElementById('nf-highlight').checked };
        
        const fileInput = document.getElementById('nf-img');
        if (fileInput.files.length > 0) {
            data.imagen = await fileToBase64(fileInput.files[0]);
        } else if (isEdit && nov.imagen) {
            data.imagen = nov.imagen;
        }

        try {
            if (isEdit) { await updateDoc(doc(db, "novedades", nov.id), data); toast('Novedad actualizada ✅'); }
            else { await addDoc(collection(db, "novedades"), data); toast('Novedad creada ✅'); }
            closeModal(); await loadNovedades();
        } catch (err) { toast('Error', true); }
    });
}

window.editNovedad = function(id) { const n = allNovedades.find(x => x.id === id); if (n) showNovedadForm(n); };
window.deleteNovedad = async function(id) {
    if (!confirm('¿Eliminar esta novedad?')) return;
    try { await deleteDoc(doc(db, "novedades", id)); toast('Novedad eliminada 🗑️'); await loadNovedades(); } catch (err) { 
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
                <h4>${p.titulo} ${p.activa ? '<span class="badge-active">Activa</span>' : '<span class="badge-inactive">Inactiva</span>'}</h4>
                <p>${p.texto}</p>
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

        const data = { titulo: document.getElementById('prf-title').value, texto: document.getElementById('prf-text').value, activa: document.getElementById('prf-active').checked };
        
        const fileInput = document.getElementById('prf-img');
        if (fileInput.files.length > 0) {
            data.imagen = await fileToBase64(fileInput.files[0]);
        } else if (isEdit && promo.imagen) {
            data.imagen = promo.imagen;
        }

        try {
            if (isEdit) { await updateDoc(doc(db, "promociones", promo.id), data); toast('Promoción actualizada ✅'); }
            else { await addDoc(collection(db, "promociones"), data); toast('Promoción creada ✅'); }
            closeModal(); await loadPromos();
        } catch (err) { toast('Error', true); }
    });
}

window.editPromo = function(id) { const p = allPromos.find(x => x.id === id); if (p) showPromoForm(p); };
window.deletePromo = async function(id) {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try { await deleteDoc(doc(db, "promociones", id)); toast('Promoción eliminada 🗑️'); await loadPromos(); } catch (err) { 
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
    try { await deleteDoc(doc(db, "galeria", id)); toast('Imagen eliminada 🗑️'); await loadGallery(); updateDashboard(); } catch (err) { 
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
    document.getElementById('stat-total').textContent = allProducts.length;
    document.getElementById('stat-disponibles').textContent = allProducts.filter(p => p.estado === 'Disponible' || !p.estado).length;
    document.getElementById('stat-vendidos').textContent = allProducts.filter(p => p.estado === 'Vendido').length;
    document.getElementById('stat-galeria').textContent = allGallery.length;

    // Category breakdown
    const breakdown = document.getElementById('cat-breakdown');
    let catsToUse = allCategories;
    if (catsToUse.length === 0) {
        catsToUse = [
            { nombre: 'Garage / Bazar', slug: 'garage' },
            { nombre: 'Personalizados', slug: 'custom' },
            { nombre: 'Copias e Impresiones', slug: 'impresiones' },
            { nombre: 'Papelería', slug: 'papeleria' }
        ];
    }
    breakdown.innerHTML = catsToUse.map(c => {
        const count = allProducts.filter(p => p.categoria === c.slug).length;
        return `<div class="cat-row"><span class="cat-name">${c.nombre}</span><span class="cat-count">${count}</span></div>`;
    }).join('');
}

// ======================================================
//  UTILIDADES
// ======================================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // Si no es imagen (ej. PDF), lo pasamos directo
        if (!file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            return;
        }

        // Si es imagen, usamos createObjectURL (mucho más ligero para la memoria RAM)
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Liberamos la memoria del objeto URL
            URL.revokeObjectURL(img.src);
            
            // Exportar como JPEG comprimido (calidad 0.6)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            resolve(compressedBase64);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };
    });
}
