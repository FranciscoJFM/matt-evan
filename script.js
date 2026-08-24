// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Configuración por defecto (se sobreescribe con Firebase)
let CONFIG = {
    WHATSAPP_NUMBER: "525614429971",
    FACEBOOK_URL: "https://www.facebook.com/MattEvan87/",
    INSTAGRAM_URL: "",
};

// Utilidades
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

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

// Mobile Menu
const hamburger = $(".hamburger");
const navLinks = $(".nav-links");
if (hamburger) {
    hamburger.addEventListener("click", () => navLinks.classList.toggle("active"));
}
$$(".nav-links a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("active"));
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
        catSnap.forEach(d => categorias.push(d.data()));

        // Si no hay categorías en Firebase, usamos las por defecto de la página
        if (categorias.length === 0) {
            categorias = [
                { nombre: 'Garage / Bazar', slug: 'garage' },
                { nombre: 'Personalizados', slug: 'custom' },
                { nombre: 'Copias e Impresiones', slug: 'impresiones' },
                { nombre: 'Papelería', slug: 'papeleria' }
            ];
        }

        // Generar filtros dinámicos
        const filtersContainer = $(".filters");
        if (filtersContainer) {
            filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="all">Todos</button>';
            categorias.forEach(c => {
                filtersContainer.innerHTML += `<button class="filter-btn" data-filter="${c.slug}">${c.nombre}</button>`;
            });
        }

        // Cargar productos (solo los disponibles o apartados con stock, los vendidos y agotados van al historial del admin)
        const snap = await getDocs(collection(db, "productos"));
        const productos = [];
        snap.forEach(d => {
            const p = d.data();
            const qty = p.cantidad ?? 1; // Si no tiene cantidad definida, asumimos 1
            const estadoOk = !p.estado || p.estado === 'Disponible' || p.estado === 'Apartado';
            if (estadoOk && qty > 0) {
                productos.push({ ...p, cantidad: qty });
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
                    <img src="${imgUrl}" alt="${prod.nombre}" class="product-img">
                    <span class="status ${badgeClass}">${estadoTexto}</span>
                    ${stockHtml}
                    ${discountBadge}
                </div>
                <div class="product-info">
                    <h3>${prod.nombre}</h3>
                    ${priceHtml}
                    <button class="btn btn-primary product-interest w-100"
                            data-nombre="${prod.nombre}"
                            data-precio="${prod.precio}">
                        Añadir al Carrito 🛒
                    </button>
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
                ${n.imagen ? `<img src="${n.imagen}" alt="${n.titulo}" style="width: 100%; border-radius: 8px; margin-bottom: 15px; object-fit: cover; max-height: 200px;">` : ''}
                <h4>${n.titulo}</h4>
                <p>${n.descripcion}</p>
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
                        <h3>${p.titulo}</h3>
                        <p>${p.texto}</p>
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
            `<div class="gallery-item"><img src="${f.imagen}" alt="${f.alt || 'Trabajo'}"></div>`
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
// CARRITO DE COMPRAS
// =========================================
let cart = [];

function setupProductCTAs() {
    $$(".product-interest").forEach(button => {
        button.addEventListener("click", () => {
            const nombre = button.dataset.nombre;
            const precio = parseInt(button.dataset.precio, 10);
            
            cart.push({ nombre, precio });
            updateCartUI();
            
            // Animación de feedback
            const originalText = button.innerHTML;
            button.innerHTML = "¡Añadido! ✅";
            button.style.background = "#25D366";
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = "";
            }, 1500);
        });
    });
}

function updateCartUI() {
    const btn = $("#floating-cart-btn");
    const count = $("#cart-count");
    if (cart.length > 0) {
        btn.classList.remove("hidden");
        count.innerText = cart.length;
    } else {
        btn.classList.add("hidden");
    }
    renderCartModal();
}

function renderCartModal() {
    const container = $("#cart-items");
    const totalEl = $("#cart-total-price");
    
    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#888;'>Tu carrito está vacío.</p>";
        totalEl.innerText = "$0 MXN";
        return;
    }

    let html = "";
    let total = 0;
    cart.forEach((item, index) => {
        total += item.precio;
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="flex:1;">
                <h4 style="margin:0; font-size:1rem;">${item.nombre}</h4>
                <span style="color:var(--primary);">$${item.precio} MXN</span>
            </div>
            <button onclick="window.removeFromCart(${index})" style="background:none; border:none; color:var(--red); font-size:1.2rem; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    });
    
    container.innerHTML = html;
    totalEl.innerText = `$${total} MXN`;
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

// Eventos del Carrito Modal
document.addEventListener("DOMContentLoaded", () => {
    const modal = $("#cart-modal");
    
    $("#floating-cart-btn")?.addEventListener("click", () => {
        modal.classList.add("active");
    });
    
    $("#close-cart-btn")?.addEventListener("click", () => {
        modal.classList.remove("active");
    });
    
    $("#send-whatsapp-btn")?.addEventListener("click", () => {
        if (cart.length === 0) return;
        
        let text = "¡Hola mattEvan! Quiero pedir lo siguiente:\n\n";
        let total = 0;
        cart.forEach(item => {
            text += `👉 ${item.nombre} - $${item.precio}\n`;
            total += item.precio;
        });
        
        text += `\n*Total a pagar: $${total} MXN*`;
        
        const comments = $("#cart-comments").value.trim();
        if (comments) {
            text += `\n\n*Comentarios adicionales:*\n${comments}`;
        }
        
        window.open(buildWhatsappUrl(text), "_blank", "noopener,noreferrer");
        
        // Limpiar carrito
        cart = [];
        $("#cart-comments").value = "";
        updateCartUI();
        modal.classList.remove("active");
    });
});

// =========================================
// INICIALIZAR TODO
// =========================================
document.addEventListener("DOMContentLoaded", async () => {
    await loadConfig();
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
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = $("#name").value.trim();
        const service = $("#service").value;
        const message = $("#message").value.trim();
        if (!name || !service || !message) { showToast("Por favor completa todos los campos."); return; }
        const text = `Hola, soy ${name}.\nVi la página de mattEvan.\n\nMe interesa: ${service}\n\nDetalle:\n${message}`;
        window.open(buildWhatsappUrl(text), "_blank", "noopener,noreferrer");
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
