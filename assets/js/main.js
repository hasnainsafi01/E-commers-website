import { db, auth, googleProvider } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;

    let currentUser = null;
    let pendingAction = null;

    // Listen for Auth State
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user && pendingAction) {
            executePendingAction();
        }
    });

    // 1. Sticky Navbar
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // 3. Theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (currentTheme === 'dark') icon.classList.replace('fa-moon', 'fa-sun');
        
        themeToggle.addEventListener('click', () => {
            const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
        });
    }

    // 4. Auth Modal Logic
    const injectAuthModal = () => {
        if (document.getElementById('authModal')) return;
        const modalHTML = `
            <div id="authModal" class="auth-modal-overlay">
                <div class="auth-modal-content">
                    <button class="modal-close-btn">&times;</button>
                    <div class="auth-modal-header">
                        <h2 class="serif">Join the CHENARI Circle</h2>
                        <p>Authenticate to continue your premium shopping experience and sync your selections across all devices.</p>
                    </div>
                    <div class="auth-modal-options">
                        <button id="modalGoogleBtn" class="auth-opt-btn google">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="google-icon" style="width: 20px; height: 20px; margin-right: 10px;">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                            Continue with Google
                        </button>
                        <div class="auth-divider"><span>OR</span></div>
                        <a href="login.html" class="auth-opt-btn email">
                            <i class="fas fa-envelope"></i> Login with Email
                        </a>
                        <a href="signup.html" class="auth-opt-btn signup">
                            <i class="fas fa-user-plus"></i> Create Account
                        </a>
                    </div>
                    <button class="modal-cancel-btn">Maybe Later</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('authModal');
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');
        const googleBtn = modal.querySelector('#modalGoogleBtn');

        const closeModal = () => modal.classList.remove('active');
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if(e.target === modal) closeModal(); };

        googleBtn.onclick = async () => {
            try {
                googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                await signInWithPopup(auth, googleProvider);
                closeModal();
            } catch (error) {
                console.error("Modal Google Login Error:", error);
                googleBtn.innerHTML = '<img src="..." alt="Google"> Continue with Google';
            }
        };
    };

    const showAuthModal = (action) => {
        pendingAction = action;
        injectAuthModal();
        setTimeout(() => document.getElementById('authModal').classList.add('active'), 10);
    };

    // Auth-guard for Navbar Links
    document.querySelectorAll('.auth-guarded').forEach(link => {
        link.addEventListener('click', (e) => {
            if (!currentUser) {
                e.preventDefault();
                showAuthModal({ type: 'nav', data: { url: link.href } });
            }
        });
    });

    const executePendingAction = () => {
        if (!pendingAction) return;
        const { type, data } = pendingAction;
        if (type === 'cart') {
            if (window.addToCart) window.addToCart(data);
            else window.showToast(`Added ${data.title} to your bag!`);
        } else if (type === 'fav') {
            if (window.handleFavClick) window.handleFavClick(data.btn, data.prod);
            else window.showToast(`Saved ${data.prod.title} to your wishlist!`);
        } else if (type === 'nav') {
            window.location.href = data.url;
        }
        pendingAction = null;
    };

    // 5. Shared Product Renderer
    const renderProductCard = (prod) => {
        const img = prod.images && prod.images.length > 0 ? prod.images[0] : 'assets/images/default.png';
        const discountTag = prod.discount > 0 ? `<span class="discount-badge">-${prod.discount}%</span>` : '';
        
        return `
            <div class="product-card" data-id="${prod.id}" style="animation: fadeInUp 0.5s ease backwards">
                <div class="product-image">
                    ${discountTag}
                    <button class="fav-btn" title="Add to Wishlist"><i class="far fa-heart"></i></button>
                    <img src="${img}" alt="${prod.title}">
                </div>
                <div class="product-info">
                    <span class="product-category">${prod.category}</span>
                    <h3 class="product-name">${prod.title}</h3>
                    <div class="product-rating">
                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">
                            <span class="current-price">$${prod.price.toLocaleString()}</span>
                        </div>
                        <button class="add-cart-btn"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
    };

    const attachListeners = (container) => {
        container.querySelectorAll('.product-card').forEach(card => {
            // Navigate to details
            card.onclick = (e) => {
                if (e.target.closest('.fav-btn') || e.target.closest('.add-cart-btn')) return;
                window.location.href = `product-details.html?id=${card.dataset.id}`;
            };

            // Fav Click
            const favBtn = card.querySelector('.fav-btn');
            favBtn.onclick = (e) => {
                e.stopPropagation();
                const prodId = card.dataset.id;
                const prodTitle = card.querySelector('.product-name').innerText;
                if (!currentUser) {
                    showAuthModal({ type: 'fav', data: { btn: favBtn, prod: { id: prodId, title: prodTitle } } });
                } else {
                    if (window.handleFavClick) window.handleFavClick(favBtn, { id: prodId, title: prodTitle });
                    else window.showToast(`Saved to wishlist!`);
                }
            };

            // Cart Click
            const cartBtn = card.querySelector('.add-cart-btn');
            cartBtn.onclick = (e) => {
                e.stopPropagation();
                const prodId = card.dataset.id;
                const prodTitle = card.querySelector('.product-name').innerText;
                if (!currentUser) {
                    showAuthModal({ type: 'cart', data: { id: prodId, title: prodTitle } });
                } else {
                    if (window.addToCart) window.addToCart({ id: prodId, title: prodTitle });
                    else window.showToast(`Added to your bag!`);
                }
            };
        });
    };

    // 6. Load Homepage Featured Products
    const featuredContainer = document.getElementById('featuredProducts');
    if (featuredContainer) {
        const loadFeatured = async () => {
            try {
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(3));
                const snapshot = await getDocs(q);
                featuredContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    featuredContainer.innerHTML += renderProductCard({ id: doc.id, ...doc.data() });
                });
                attachListeners(featuredContainer);
            } catch (error) {
                console.error("Error loading featured:", error);
            }
        };
        loadFeatured();
    }

    // 7. Load Product Listing Page
    const productsListContainer = document.getElementById('productsList');
    if (productsListContainer) {
        let allProducts = [];
        const loadAll = async () => {
            try {
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                allProducts = [];
                snapshot.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
                renderAndFilter();
            } catch (error) {
                console.error("Error loading all:", error);
            }
        };

        const renderAndFilter = () => {
            const activeChip = document.querySelector('.chip.active');
            const activeCat = activeChip ? activeChip.dataset.category : 'all';
            const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
            const filtered = allProducts.filter(p => {
                const matchesCat = activeCat === 'all' || p.category.toLowerCase() === activeCat.toLowerCase();
                return matchesCat && p.title.toLowerCase().includes(searchTerm);
            });
            productsListContainer.innerHTML = filtered.map(p => renderProductCard(p)).join('');
            attachListeners(productsListContainer);
        };

        document.querySelectorAll('.chip').forEach(chip => {
            chip.onclick = () => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                renderAndFilter();
            };
        });
        document.getElementById('searchInput')?.addEventListener('input', renderAndFilter);
        loadAll();
    }

    // 8. Global Search
    const globalSearchInput = document.getElementById('globalSearchInput');
    const searchResults = document.getElementById('searchResults');
    if (globalSearchInput && searchResults) {
        let allProductsCache = [];
        let searchTimeout = null;

        const performSearch = async () => {
            const term = globalSearchInput.value.trim().toLowerCase();
            if (term.length < 2) {
                searchResults.classList.add('hidden');
                return;
            }

            if (allProductsCache.length === 0) {
                const q = query(collection(db, 'products'));
                const snapshot = await getDocs(q);
                allProductsCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            const results = allProductsCache.filter(p => 
                p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
            ).slice(0, 5);

            if (results.length > 0) {
                searchResults.innerHTML = results.map(p => `
                    <a href="product-details.html?id=${p.id}" class="search-result-item">
                        <img src="${p.images?.[0] || 'assets/images/default.png'}" class="search-result-img">
                        <div class="search-result-info">
                            <span class="search-result-title">${p.title}</span>
                            <span class="search-result-price">$${p.price.toLocaleString()}</span>
                        </div>
                    </a>
                `).join('');
                searchResults.classList.remove('hidden');
            } else {
                searchResults.innerHTML = `<div class="search-result-item">No items found for "${term}"</div>`;
                searchResults.classList.remove('hidden');
            }
        };

        globalSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 300);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    // 9. Global Utility
    if (!window.showToast) {
        window.showToast = (message, type = 'success') => {
            const toast = document.createElement('div');
            toast.className = `toast-notification ${type}`;
            toast.style.background = type === 'error' ? 'var(--primary-red)' : '#111';
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };
    }
});
