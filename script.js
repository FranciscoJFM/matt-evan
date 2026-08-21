// Configuración
const CONFIG = {
    WHATSAPP_NUMBER: "525614429971", // Reemplazar con número real
    INSTAGRAM_URL: "https://www.facebook.com/MattEvan87/", // Reemplazar con Instagram real
};

// Utilidades
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Toast
function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// WhatsApp URL Builder
function buildWhatsappUrl(text) {
    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

// Mobile Menu
const hamburger = $(".hamburger");
const navLinks = $(".nav-links");

hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

// Close menu on click
$$(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("active");
    });
});

// Navbar scroll effect
window.addEventListener("scroll", () => {
    const navbar = $("#navbar");
    if (window.scrollY > 50) {
        navbar.style.background = "rgba(5, 8, 15, 0.95)";
    } else {
        navbar.style.background = "rgba(10, 15, 26, 0.8)";
    }
});

// =========================================
// Catálogo Dinámico (JSON)
// =========================================
async function loadCatalog() {
    try {
        const response = await fetch('productos.json');
        const productos = await response.json();

        const container = $("#catalog-container");
        container.innerHTML = ''; // Limpiar contenedor

        productos.forEach(prod => {
            // Determinar clase del badge según estado
            let badgeClass = 'badge-available';
            if (prod.estado === 'Vendido') badgeClass = 'badge-sold';
            if (prod.estado === 'Apartado') badgeClass = 'badge-reserved';

            // Construir tarjeta
            const card = document.createElement('div');
            card.className = 'product-card reveal visible'; // visible para que no espere scroll si ya cargó
            card.setAttribute('data-category', prod.categoria);

            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${prod.imagen}" alt="${prod.nombre}" class="product-img">
                    <span class="status ${badgeClass}">${prod.estado}</span>
                </div>
                <div class="product-info">
                    <h3>${prod.nombre}</h3>
                    <p class="price">$${prod.precio} MXN</p>
                    <button class="btn btn-primary product-interest w-100" 
                            data-nombre="${prod.nombre}" 
                            data-precio="${prod.precio}">
                        Preguntar por WhatsApp
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        // Setup Filters & CTAs after loading
        setupFilters();
        setupProductCTAs();

    } catch (error) {
        console.error("Error cargando el catálogo:", error);
        $("#catalog-container").innerHTML = '<p style="text-align:center; width:100%;">No se pudieron cargar los productos en este momento.</p>';
    }
}

// Configurar Filtros
function setupFilters() {
    const filterBtns = $$(".filter-btn");
    const productCards = $$(".product-card");

    filterBtns.forEach(btn => {
        // Remover eventos previos si los hay (prevención de duplicados)
        btn.replaceWith(btn.cloneNode(true));
    });

    // Re-seleccionar botones clonados
    $$(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const filterValue = btn.getAttribute("data-filter");
            const productCards = $$(".product-card");

            productCards.forEach(card => {
                if (filterValue === "all" || card.getAttribute("data-category") === filterValue) {
                    card.style.display = "block";
                    setTimeout(() => {
                        card.style.opacity = "1";
                        card.style.transform = "scale(1)";
                    }, 50);
                } else {
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.9)";
                    setTimeout(() => {
                        card.style.display = "none";
                    }, 300);
                }
            });
        });
    });
}

// Configurar CTAs de Productos
function setupProductCTAs() {
    $$(".product-interest").forEach(button => {
        button.addEventListener("click", () => {
            const nombre = button.dataset.nombre;
            const precio = button.dataset.precio;
            const text = `Hola, vi el ${nombre} de $${precio} en mattEvan. ¿Todavía está disponible?`;
            window.open(buildWhatsappUrl(text), "_blank", "noopener,noreferrer");
        });
    });
}

// Iniciar carga de catálogo
document.addEventListener("DOMContentLoaded", () => {
    loadCatalog();
});


// =========================================
// FAQ Accordion
// =========================================
const faqItems = $$(".faq-item");

faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
        const isActive = item.classList.contains("active");

        // Close all items
        faqItems.forEach(i => {
            i.classList.remove("active");
            i.querySelector(".faq-answer").style.maxHeight = null;
        });

        // If it wasn't active, open it
        if (!isActive) {
            item.classList.add("active");
            const answer = item.querySelector(".faq-answer");
            answer.style.maxHeight = answer.scrollHeight + "px";
        }
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

        if (!name || !service || !message) {
            showToast("Por favor completa todos los campos.");
            return;
        }

        const text = `Hola, soy ${name}.
Vi la página de mattEvan.

Me interesa: ${service}

Detalle:
${message}`;

        window.open(buildWhatsappUrl(text), "_blank", "noopener,noreferrer");
    });
}


// =========================================
// Scroll Reveal
// =========================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target); // Solo anima una vez
        }
    });
}, { threshold: 0.15 });

$$(".reveal").forEach(el => revealObserver.observe(el));

// Dynamic year and Social links
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const igLink = $("#instagram-link");
if (igLink) igLink.href = CONFIG.INSTAGRAM_URL;

// =========================================
// Interactive Features
// =========================================

// 1. Cursor Glow Effect
const cursorGlow = $(".cursor-glow");
if (cursorGlow) {
    document.addEventListener("mousemove", (e) => {
        cursorGlow.style.left = e.clientX + "px";
        cursorGlow.style.top = e.clientY + "px";
    });
}

// 2. Typewriter Effect
const words = ["Páginas Web.", "Tazas.", "Playeras.", "Impresiones.", "Stickers.", "Identidad."];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typewriterElement = $("#typewriter");

function type() {
    if (!typewriterElement) return;

    const currentWord = words[wordIndex];

    if (isDeleting) {
        typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = 100;

    if (isDeleting) {
        typeSpeed /= 2; // Delete faster
    }

    if (!isDeleting && charIndex === currentWord.length) {
        // Pause at end of word
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 500; // Pause before starting new word
    }

    setTimeout(type, typeSpeed);
}

// Start typewriter effect after a short delay
setTimeout(type, 1000);
