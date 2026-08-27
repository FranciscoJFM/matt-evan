// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBpEFLhubbnSpy5W3ziUpovZC-KN8RYtWQ",
    authDomain: "mattevan-6c73f.firebaseapp.com",
    projectId: "mattevan-6c73f",
    storageBucket: "mattevan-6c73f.firebasestorage.app",
    messagingSenderId: "785204146637",
    appId: "1:785204146637:web:75a4648870853886081484"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function createOrderFolio() {
    const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `ME-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function createEncargo(cliente, telefono, producto, origen, details = {}) {
    const folio = createOrderFolio();
    const reference = await addDoc(collection(db, "encargos"), {
        cliente,
        telefono,
        producto,
        estado: "Nuevo",
        origen,
        folio,
        categoria: details.categoria || '',
        total: Number(details.total) || 0,
        anticipo: 0,
        fechaEntrega: details.fechaEntrega || '',
        tipoEntrega: details.tipoEntrega || 'Por acordar',
        notas: details.notas || '',
        creadoEn: serverTimestamp()
    });
    return { reference, folio };
}

// Configuración por defecto (se sobreescribe con Firebase)
let CONFIG = {
    WHATSAPP_NUMBER: "525614429971",
    FACEBOOK_URL: "https://www.facebook.com/MattEvan87/",
    INSTAGRAM_URL: "",
};

// Utilidades
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);
let publicCategories = [];

function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function buildWhatsappUrl(text) {
    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function isValidPhone(value) {
    const digits = String(value).replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
}

// Mobile Menu
const hamburger = $(".hamburger");
const navLinks = $(".nav-links");
if (hamburger) {
    hamburger.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("active");
        hamburger.setAttribute('aria-expanded', String(isOpen));
        hamburger.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });
}
$$(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        hamburger?.setAttribute('aria-expanded', 'false');
    });
});

// Navbar scroll
window.addEventListener("scroll", () => {
    const navbar = $("#navbar");
    if (!navbar) return;
    navbar.style.background = window.scrollY > 50 ? "rgba(5, 8, 15, 0.95)" : "rgba(10, 15, 26, 0.8)";
});

// =========================================
// CARGAR CONFIG DESDE FIREBASE
// =========================================
async function loadConfig() {
    try {
        const docSnap = await getDoc(doc(db, "configuracion", "general"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.whatsappNumber) CONFIG.WHATSAPP_NUMBER = data.whatsappNumber;
            if (data.facebookUrl) CONFIG.FACEBOOK_URL = data.facebookUrl;
            if (data.instagramUrl) CONFIG.INSTAGRAM_URL = data.instagramUrl;
        }
    } catch (err) { console.log('Usando config por defecto'); }

    // Actualizar links en la página
    const waFloat = $(".whatsapp-float");
    if (waFloat) waFloat.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;
    const waFooter = $('a[href*="wa.me"]');
    if (waFooter) waFooter.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;
    const igLink = $("#instagram-link");
    if (igLink) igLink.href = CONFIG.FACEBOOK_URL || CONFIG.INSTAGRAM_URL || '#';
}

// =========================================
// CATÁLOGO DINÁMICO (Firebase)
// =========================================
async function loadCatalog() {
    try {
        // Cargar categorías de Firebase
        const catSnap = await getDocs(collection(db, "categorias"));
        let categorias = [];
        catSnap.forEach(d => categorias.push({ id: d.id, ...d.data() }));

        // Si no hay categorías en Firebase, usamos las por defecto de la página
        if (categorias.length === 0) {
            categorias = [
                { nombre: 'Garage / Bazar', slug: 'garage' },
                { nombre: 'Personalizados', slug: 'custom' },
                { nombre: 'Copias, Impresiones y Escáner', slug: 'copias-impresiones-escaner', icono: '🖨️' },
                { nombre: 'Papelería', slug: 'papeleria' }
            ];
        }
        publicCategories = categorias.filter(c => c.activa !== false);

        const serviceSelect = $("#service");
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Selecciona una opción...</option>' + publicCategories.map(c =>
                `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.icono || '🏷️')} ${escapeHtml(c.nombre)}</option>`
            ).join('') + '<option value="otro">Otro / Pedido especial</option>';
        }

        // Generar filtros dinámicos
        const filtersContainer = $(".filters");
        if (filtersContainer) {
            filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="all">Todos</button>';
            publicCategories.forEach(c => {
                filtersContainer.innerHTML += `<button class="filter-btn" data-filter="${escapeHtml(c.slug)}">${escapeHtml(c.icono || '')} ${escapeHtml(c.nombre)}</button>`;
            });
        }

        // Cargar productos (solo los disponibles o apartados con stock, los vendidos y agotados van al historial del admin)
        const snap = await getDocs(collection(db, "productos"));
        const productos = [];
        snap.forEach(d => {
            const p = d.data();
            const qty = p.cantidad ?? 1; // Si no tiene cantidad definida, asumimos 1
            const estadoOk = !p.estado || p.estado === 'Disponible' || p.estado === 'Apartado';
            const linkedCategory = categorias.find(category => category.slug === p.categoria);
            const categoryVisible = !linkedCategory || linkedCategory.activa !== false;
            if (estadoOk && qty > 0 && categoryVisible) {
                productos.push({ id: d.id, ...p, cantidad: qty });
            }
        });

        const container = $("#catalog-container");
        if (!container) return;
        container.innerHTML = '';

        if (productos.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">Aún no hay productos disponibles.</p>';
            return;
        }

        productos.forEach(prod => {
            let badgeClass = 'badge-available';
            let estadoTexto = prod.estado || 'Disponible';
            if (estadoTexto === 'Vendido') badgeClass = 'badge-sold';
            if (estadoTexto === 'Apartado') badgeClass = 'badge-reserved';

            const card = document.createElement('div');
            card.className = 'product-card reveal visible';
            card.setAttribute('data-category', prod.categoria || 'otro');

            const imgUrl = prod.imagen || 'https://via.placeholder.com/300x300?text=Sin+Imagen';
            const qty = prod.cantidad ?? 1;
            const stockHtml = prod.estado === 'Apartado' ? '' :
                qty <= 2 ? `<span class="stock-warning">🔥 ¡Último${qty > 1 ? 's ' + qty : ''}!</span>` : '';

            let priceHtml = `<p class="price">$${prod.precio} MXN</p>`;
            let discountBadge = '';
            if (prod.precioViejo && prod.precioViejo > prod.precio) {
                const discount = Math.round(((prod.precioViejo - prod.precio) / prod.precioViejo) * 100);
                priceHtml = `<p class="price"><span class="old-price">$${prod.precioViejo}</span> $${prod.precio} MXN</p>`;
                discountBadge = `<span class="discount-badge">-${discount}%</span>`;
            }

            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(prod.nombre)}" class="product-img" loading="lazy" decoding="async">
                    <span class="status ${badgeClass}">${escapeHtml(estadoTexto)}</span>
                    ${stockHtml}
                    ${discountBadge}
                </div>
                <div class="product-info">
                    <h3>${escapeHtml(prod.nombre)}</h3>
                    ${prod.descripcion ? `<p class="product-description">${escapeHtml(prod.descripcion)}</p>` : ''}
                    ${priceHtml}
                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                        <button class="btn btn-primary product-add-cart"
                                data-nombre="${escapeHtml(prod.nombre)}"
                                data-precio="${prod.precio}"
                                data-id="${prod.id}"
                                data-stock="${qty}"
                                data-categoria="${escapeHtml(prod.categoria || '')}"
                                style="width:100%;">
                            🛒 Agregar al pedido
                        </button>
                        <button class="btn btn-secondary product-ask-wa"
                                data-nombre="${escapeHtml(prod.nombre)}"
                                data-precio="${prod.precio}"
                                style="width:100%;">
                            <i class="fa-brands fa-whatsapp"></i> Preguntar
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        setupFilters();
        setupProductCTAs();
    } catch (error) {
        console.error("Error cargando catálogo:", error);
        const container = $("#catalog-container");
        if (container) container.innerHTML = '<p style="text-align:center; width:100%;">No se pudieron cargar los productos.</p>';
    }
}

// =========================================
// NOVEDADES DINÁMICAS
// =========================================
async function loadNovedades() {
    try {
        const snap = await getDocs(collection(db, "novedades"));
        const novedades = [];
        snap.forEach(d => novedades.push(d.data()));

        const grid = $(".novedades-grid");
        if (!grid || novedades.length === 0) return;

        grid.innerHTML = novedades.map(n =>
            `<div class="novedad-card ${n.destacada ? 'highlight' : ''}">
                ${n.imagen ? `<img src="${escapeHtml(n.imagen)}" alt="${escapeHtml(n.titulo)}" loading="lazy" style="width: 100%; border-radius: 8px; margin-bottom: 15px; object-fit: cover; max-height: 200px;">` : ''}
                <h4>${escapeHtml(n.titulo)}</h4>
                <p>${escapeHtml(n.descripcion)}</p>
            </div>`
        ).join('');
    } catch (err) { console.log('Novedades: usando HTML estático'); }
}

// =========================================
// PROMOCIONES DINÁMICAS
// =========================================
async function loadPromos() {
    try {
        const snap = await getDocs(collection(db, "promociones"));
        const promos = [];
        snap.forEach(d => promos.push(d.data()));

        const activePromos = promos.filter(p => p.activa);
        const promoSection = $("#promotions");
        if (!promoSection) return;

        if (activePromos.length === 0) {
            promoSection.style.display = 'none';
            return;
        }

        promoSection.style.display = '';
        const container = promoSection.querySelector('.container');
        if (container) {
            container.innerHTML = activePromos.map(p =>
                `<div class="promo-banner reveal visible" ${p.imagen ? `style="background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${p.imagen}'); background-size: cover; background-position: center;"` : ''}>
                    <div class="promo-content">
                        <h3>${escapeHtml(p.titulo)}</h3>
                        <p>${escapeHtml(p.texto)}</p>
                    </div>
                </div>`
            ).join('');
        }
    } catch (err) { console.log('Promos: usando HTML estático'); }
}

// =========================================
// GALERÍA DINÁMICA
// =========================================
async function loadGallery() {
    try {
        const snap = await getDocs(collection(db, "galeria"));
        const fotos = [];
        snap.forEach(d => fotos.push(d.data()));

        const grid = $(".gallery-grid");
        if (!grid || fotos.length === 0) return;

        grid.innerHTML = fotos.map(f =>
            `<div class="gallery-item"><img src="${escapeHtml(f.imagen)}" alt="${escapeHtml(f.alt || 'Trabajo')}" loading="lazy" decoding="async"></div>`
        ).join('');
    } catch (err) { console.log('Galería: usando HTML estático'); }
}

// =========================================
// FILTROS
// =========================================
function setupFilters() {
    const searchInput = $("#catalog-search");
    
    function applyFilters() {
        const activeBtn = $(".filter-btn.active");
        const filterCategory = activeBtn ? activeBtn.getAttribute("data-filter") : "all";
        const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";

        $$(".product-card").forEach(card => {
            const cardCategory = card.getAttribute("data-category");
            const cardName = card.querySelector("h3").textContent.toLowerCase();
            
            const matchCategory = filterCategory === "all" || cardCategory === filterCategory;
            const matchSearch = cardName.includes(searchText);

            if (matchCategory && matchSearch) {
                card.style.display = "block";
                setTimeout(() => { card.style.opacity = "1"; card.style.transform = "scale(1)"; }, 50);
            } else {
                card.style.opacity = "0"; card.style.transform = "scale(0.9)";
                setTimeout(() => card.style.display = "none", 300);
            }
        });
    }

    // Eventos para los botones de categoría
    $$(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilters();
        });
    });

    // Evento para el buscador
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            applyFilters();
        });
    }
}

// =========================================
// CARRITO DE COMPRAS (con persistencia localStorage)
// =========================================
let cart = JSON.parse(localStorage.getItem('mattevan_cart') || '[]').map(item => ({
    ...item,
    cantidad: Number(item.cantidad) || 1,
    precio: Number(item.precio) || 0
}));

function saveCart() {
    localStorage.setItem('mattevan_cart', JSON.stringify(cart));
}

function setupProductCTAs() {
    // Botón: Añadir al carrito
    $$(".product-add-cart").forEach(button => {
        const nombre = button.dataset.nombre;
        
        // Marcar como ya en carrito si persistió en localStorage
        const alreadyInCart = cart.some(item => (item.id && item.id === button.dataset.id) || item.nombre === nombre);
        if (alreadyInCart) {
            button.innerHTML = "➕ Agregar otra unidad";
            button.classList.add('in-cart');
        }

        button.addEventListener("click", () => {
            const precio = Number(button.dataset.precio);
            const id = button.dataset.id;
            const stock = Number(button.dataset.stock) || 1;
            const existing = cart.find(item => (item.id && item.id === id) || item.nombre === nombre);
            if (existing) {
                if (existing.cantidad >= stock) { showToast(`Sólo hay ${stock} disponible${stock === 1 ? '' : 's'}.`); return; }
                existing.cantidad += 1;
            } else {
                cart.push({ id, nombre, precio, cantidad: 1, stock, categoria: button.dataset.categoria || '' });
            }
            saveCart();
            updateCartUI();

            button.innerHTML = "➕ Agregar otra unidad";
            button.classList.add('in-cart');
        });
    });

    // Botón: Preguntar directo por WhatsApp
    $$(".product-ask-wa").forEach(button => {
        button.addEventListener("click", () => {
            const nombre = button.dataset.nombre;
            const precio = button.dataset.precio;
            const text = `Hola, vi el *${nombre}* de $${precio} en mattEvan. ¿Todavía está disponible?`;
            window.open(buildWhatsappUrl(text), "_blank", "noopener,noreferrer");
        });
    });
}

function updateCartUI() {
    const btn = document.getElementById("floating-cart-btn");
    const count = document.getElementById("cart-count");
    if (!btn) return;
    if (cart.length > 0) {
        btn.classList.remove("hidden");
        count.innerText = cart.reduce((sum, item) => sum + item.cantidad, 0);
    } else {
        btn.classList.add("hidden");
    }
    renderCartModal();
}

function renderCartModal() {
    const container = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total-price");
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">Tu carrito está vacío. 🛒</p>`;
        if (totalEl) totalEl.innerText = "$0 MXN";
        return;
    }

    let html = "";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.precio * item.cantidad;
        html += `
        <div class="cart-item-row">
            <div style="flex:1;">
                <h4>${escapeHtml(item.nombre)}</h4>
                <span>$${item.precio.toLocaleString('es-MX')} × ${item.cantidad} = $${(item.precio * item.cantidad).toLocaleString('es-MX')} MXN</span>
                <div class="cart-quantity" aria-label="Cantidad de ${escapeHtml(item.nombre)}">
                    <button type="button" onclick="window.changeCartQuantity(${index}, -1)" aria-label="Quitar una unidad">−</button>
                    <strong>${item.cantidad}</strong>
                    <button type="button" onclick="window.changeCartQuantity(${index}, 1)" aria-label="Agregar una unidad">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="window.removeFromCart(${index})" aria-label="Eliminar ${escapeHtml(item.nombre)}">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>`;
    });

    container.innerHTML = html;
    if (totalEl) totalEl.innerText = `$${total.toLocaleString('es-MX')} MXN`;
}

window.changeCartQuantity = function(index, change) {
    const item = cart[index];
    if (!item) return;
    const nextQuantity = item.cantidad + change;
    if (nextQuantity < 1) { window.removeFromCart(index); return; }
    if (item.stock && nextQuantity > item.stock) { showToast(`Máximo disponible: ${item.stock}.`); return; }
    item.cantidad = nextQuantity;
    saveCart();
    updateCartUI();
};

window.removeFromCart = function(index) {
    const removedName = cart[index]?.nombre;
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    
    // Desmarcar el botón del producto correspondiente
    if (removedName) {
        $$(".product-add-cart").forEach(btn => {
            if (btn.dataset.nombre === removedName) {
                btn.innerHTML = "🛒 Agregar al pedido";
                btn.classList.remove('in-cart');
                btn.disabled = false;
            }
        });
    }
};

// Inicializar listeners del modal del carrito (se llama después de render)
function setupCartModal() {
    const modal = document.getElementById("cart-modal");
    const floatingBtn = document.getElementById("floating-cart-btn");
    const closeBtn = document.getElementById("close-cart-btn");
    const sendBtn = document.getElementById("send-whatsapp-btn");

    // Evitar duplicar listeners
    floatingBtn?.addEventListener("click", () => {
        renderCartModal();
        modal.classList.add("active");
    });

    closeBtn?.addEventListener("click", () => {
        modal.classList.remove("active");
    });

    // Cerrar al hacer clic en el fondo oscuro
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
    });

    sendBtn?.addEventListener("click", async () => {
        if (cart.length === 0) {
            alert("¡Tu carrito está vacío! Añade algún producto primero.");
            return;
        }

        const cliente = document.getElementById("cart-customer-name").value.trim();
        const telefono = document.getElementById("cart-customer-phone").value.trim();
        const fechaEntrega = document.getElementById("cart-preferred-date").value;
        const tipoEntrega = document.getElementById("cart-delivery-type").value;
        if (cliente.length < 2 || !isValidPhone(telefono)) {
            showToast("Escribe tu nombre y teléfono para registrar el pedido.");
            return;
        }

        let text = "¡Hola mattEvan! Quiero pedir lo siguiente:\n\n";
        let total = 0;
        cart.forEach(item => {
            const subtotal = item.precio * item.cantidad;
            text += `👉 ${item.cantidad} × ${item.nombre} - $${subtotal.toLocaleString('es-MX')}\n`;
            total += subtotal;
        });
        text += `\n*Total a pagar: $${total} MXN*`;

        const comments = document.getElementById("cart-comments").value.trim();
        if (comments) {
            text += `\n\n*Comentarios:*\n${comments}`;
        }

        const producto = cart.map(item => `${item.cantidad} × ${item.nombre} - $${(item.precio * item.cantidad).toLocaleString('es-MX')} MXN`).join("; ")
            + (comments ? `. Comentarios: ${comments}` : "");
        const whatsappWindow = window.open("about:blank", "_blank");
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando pedido...';

        try {
            const { folio } = await createEncargo(cliente, telefono, producto, "Carrito web", {
                total,
                categoria: cart.length === 1 ? cart[0].categoria : 'varios',
                notas: comments,
                fechaEntrega,
                tipoEntrega
            });
            if (whatsappWindow) {
                whatsappWindow.opener = null;
                whatsappWindow.location.href = buildWhatsappUrl(text);
            } else {
                window.location.href = buildWhatsappUrl(text);
            }
            showToast(`Pedido ${folio} registrado correctamente.`);
            const confirmation = document.getElementById('cart-order-confirmation');
            confirmation.hidden = false;
            confirmation.textContent = `Pedido recibido. Guarda tu folio: ${folio}`;
        } catch (error) {
            whatsappWindow?.close();
            console.error("Error registrando pedido:", error);
            showToast("No se pudo registrar el pedido. Intenta nuevamente.");
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Registrar y enviar pedido';
            return;
        }

        cart = [];
        saveCart();
        document.getElementById("cart-customer-name").value = "";
        document.getElementById("cart-customer-phone").value = "";
        document.getElementById("cart-preferred-date").value = "";
        document.getElementById("cart-delivery-type").value = "Por acordar";
        document.getElementById("cart-comments").value = "";
        
        // Desmarcar todos los botones
        $$(".product-add-cart").forEach(btn => {
            btn.innerHTML = "🛒 Agregar al pedido";
            btn.classList.remove('in-cart');
            btn.disabled = false;
        });
        
        updateCartUI();
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Registrar y enviar pedido';
    });
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.getElementById('cart-modal')?.classList.remove('active');
});

// =========================================
// INICIALIZAR TODO
// =========================================
document.addEventListener("DOMContentLoaded", async () => {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('preferred-date')?.setAttribute('min', today);
    document.getElementById('cart-preferred-date')?.setAttribute('min', today);
    await loadConfig();
    setupCartModal();
    updateCartUI(); // Restaurar carrito desde localStorage
    await Promise.all([loadCatalog(), loadNovedades(), loadPromos(), loadGallery()]);
});

// =========================================
// FAQ Accordion
// =========================================
const faqItems = $$(".faq-item");
faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
        const isActive = item.classList.contains("active");
        faqItems.forEach(i => { i.classList.remove("active"); i.querySelector(".faq-answer").style.maxHeight = null; });
        if (!isActive) { item.classList.add("active"); const answer = item.querySelector(".faq-answer"); answer.style.maxHeight = answer.scrollHeight + "px"; }
    });
});

// =========================================
// Form -> WhatsApp
// =========================================
const form = $("#contact-form");
if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = $("#name").value.trim();
        const phone = $("#phone").value.trim();
        const service = $("#service").value;
        const message = $("#message").value.trim();
        const preferredDate = $("#preferred-date").value;
        const deliveryType = $("#delivery-type").value;
        if (name.length < 2 || !isValidPhone(phone) || !service || message.length < 3) { showToast("Por favor completa todos los campos con datos válidos."); return; }
        const text = `Hola, soy ${name}.\nVi la página de mattEvan.\n\nMe interesa: ${service}\n\nDetalle:\n${message}`;
        const submitBtn = form.querySelector('button[type="submit"]');
        const whatsappWindow = window.open("about:blank", "_blank");
        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando pedido...";

        try {
            const { folio } = await createEncargo(name, phone, `${service}: ${message}`, "Formulario web", {
                categoria: service,
                notas: message,
                fechaEntrega: preferredDate,
                tipoEntrega: deliveryType
            });
            if (whatsappWindow) {
                whatsappWindow.opener = null;
                whatsappWindow.location.href = buildWhatsappUrl(text);
            } else {
                window.location.href = buildWhatsappUrl(text);
            }
            form.reset();
            showToast(`Pedido ${folio} registrado correctamente.`);
            const confirmation = document.getElementById('contact-order-confirmation');
            confirmation.hidden = false;
            confirmation.textContent = `Pedido recibido. Guarda tu folio: ${folio}`;
        } catch (error) {
            whatsappWindow?.close();
            console.error("Error registrando pedido:", error);
            showToast("No se pudo registrar el pedido. Intenta nuevamente.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrar y enviar por WhatsApp 💬";
        }
    });
}

// =========================================
// Scroll Reveal
// =========================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); revealObserver.unobserve(entry.target); } });
}, { threshold: 0.15 });
$$(".reveal").forEach(el => revealObserver.observe(el));

// Dynamic year
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// =========================================
// Cursor Glow & Typewriter
// =========================================
const cursorGlow = $(".cursor-glow");
if (cursorGlow) {
    document.addEventListener("mousemove", (e) => { cursorGlow.style.left = e.clientX + "px"; cursorGlow.style.top = e.clientY + "px"; });
}

const words = ["Páginas Web.", "Tazas.", "Playeras.", "Impresiones.", "Stickers.", "Identidad."];
let wordIndex = 0, charIndex = 0, isDeleting = false;
const typewriterElement = $("#typewriter");

function type() {
    if (!typewriterElement) return;
    const currentWord = words[wordIndex];
    typewriterElement.textContent = isDeleting ? currentWord.substring(0, charIndex - 1) : currentWord.substring(0, charIndex + 1);
    isDeleting ? charIndex-- : charIndex++;
    let typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentWord.length) { typeSpeed = 2000; isDeleting = true; }
    else if (isDeleting && charIndex === 0) { isDeleting = false; wordIndex = (wordIndex + 1) % words.length; typeSpeed = 500; }
    setTimeout(type, typeSpeed);
}
setTimeout(type, 1000);
