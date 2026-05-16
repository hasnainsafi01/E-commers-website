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
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/listview/google.svg" alt="Google">
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

    const executePendingAction = () => {
        if (!pendingAction) return;
        const { type, data } = pendingAction;
        if (type === 'cart') {
            if (window.addToCart) window.addToCart(data);
            else window.showToast(`Added ${data.title} to your bag!`);
        } else if (type === 'fav') {
            if (window.handleFavClick) window.handleFavClick(data.btn, data.prod);
            else window.showToast(`Saved ${data.prod.title} to your wishlist!`);
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

    // 8. Global Utility
    window.showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
});
