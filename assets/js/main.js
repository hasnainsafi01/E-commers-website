/* CHENARI E-commerce Navbar Logic */

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;

    // 1. Sticky Navbar Effect on Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }

    // Close menu when clicking links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
        });
    });

    // 3. Theme Switcher (Dark/Light)
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    }

    // 4. Cart/Favorite Simulation (Optional but requested)
    // You can update the .badge text here dynamically
    function updateCartCount(count) {
        const cartBadge = document.querySelector('.fa-shopping-cart + .badge');
        if (cartBadge) cartBadge.innerText = count;
    }

    // Initial simulation
    updateCartCount(3);

    // 5. Product Card Interactions
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        // Navigate to details on card click
        card.addEventListener('click', (e) => {
            // Prevent navigation if clicking buttons inside the card
            if (e.target.closest('.fav-btn') || e.target.closest('.add-cart-btn')) {
                return;
            }
            const productId = card.getAttribute('data-id');
            window.location.href = `product-details.html?id=${productId}`;
        });

        // Favorite Toggle
        const favBtn = card.querySelector('.fav-btn');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop bubbling to card
                favBtn.classList.toggle('active');
                const icon = favBtn.querySelector('i');
                if (favBtn.classList.contains('active')) {
                    icon.classList.replace('far', 'fas');
                    showToast('Added to Wishlist!');
                } else {
                    icon.classList.replace('fas', 'far');
                }
            });
        }

        // Add to Cart
        const addCartBtn = card.querySelector('.add-cart-btn');
        if (addCartBtn) {
            addCartBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop bubbling to card
                let currentCount = parseInt(document.querySelector('.fa-shopping-cart + .badge').innerText);
                updateCartCount(currentCount + 1);
                showToast('Item added to cart!');
                
                // Button animation
                addCartBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    addCartBtn.innerHTML = '<i class="fas fa-plus"></i>';
                }, 2000);
            });
        }
    });

    // Helper: Toast Notification Simulation
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerText = message;
        document.body.appendChild(toast);
        
        // Simple styles for toast (usually would be in CSS)
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: 'var(--text-color)',
            color: 'var(--bg-color)',
            padding: '12px 25px',
            borderRadius: '10px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            zIndex: '9999',
            animation: 'fadeInUp 0.3s ease'
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 6. Product Listing Page Logic
    const productsContainer = document.getElementById('productsList');
    if (productsContainer) {
        const productsData = [
            { id: 1, name: 'Chronos Heritage IV', category: 'Watches', price: 4200, rating: 4.8, img: 'assets/images/watch.png', discount: '-20%' },
            { id: 2, name: 'Atelier Suede Tote', category: 'Bags', price: 1850, rating: 4.2, img: 'assets/images/bag.png', discount: null },
            { id: 3, name: 'Linear Low-Top', category: 'Shoes', price: 650, rating: 5.0, img: 'assets/images/shoes.png', discount: '-15%' },
            { id: 4, name: 'Midnight Classic', category: 'Watches', price: 8200, rating: 4.9, img: 'assets/images/watch_2.png', discount: 'New' },
            { id: 5, name: 'Portfolio Briefcase', category: 'Bags', price: 2100, rating: 4.7, img: 'assets/images/bag.png', discount: null },
            { id: 6, name: 'Chelsea Loafer', category: 'Shoes', price: 1250, rating: 4.6, img: 'assets/images/shoes.png', discount: null }
        ];

        let filteredProducts = [...productsData];

        // Simulation of loading
        const showSkeletons = () => {
            productsContainer.innerHTML = '';
            for (let i = 0; i < 6; i++) {
                productsContainer.innerHTML += `
                    <div class="skeleton-card">
                        <div class="skeleton-img"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text short"></div>
                            <div class="skeleton-text medium"></div>
                        </div>
                    </div>
                `;
            }
        };

        const renderProducts = (data) => {
            productsContainer.innerHTML = '';
            if (data.length === 0) {
                productsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">No products found matching your criteria.</p>';
                return;
            }
            data.forEach(prod => {
                const discountTag = prod.discount ? `<span class="discount-badge">${prod.discount}</span>` : '';
                productsContainer.innerHTML += `
                    <div class="product-card" data-id="${prod.id}" style="animation: fadeInUp 0.5s ease backwards">
                        <div class="product-image">
                            ${discountTag}
                            <button class="fav-btn" title="Add to Wishlist"><i class="far fa-heart"></i></button>
                            <img src="${prod.img}" alt="${prod.name}">
                        </div>
                        <div class="product-info">
                            <span class="product-category">${prod.category}</span>
                            <h3 class="product-name">${prod.name}</h3>
                            <div class="product-rating">
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star"></i>
                                <i class="fas fa-star-half-alt"></i>
                                <span>(${prod.rating})</span>
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
            });
            // Re-attach event listeners to new elements
            attachProductListeners();
        };

        const filterAndRender = () => {
            const activeCat = document.querySelector('.chip.active').dataset.category;
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const sortBy = document.getElementById('sortSelect').value;

            filteredProducts = productsData.filter(p => {
                const matchesCat = activeCat === 'all' || p.category.toLowerCase() === activeCat.toLowerCase();
                const matchesSearch = p.name.toLowerCase().includes(searchTerm);
                return matchesCat && matchesSearch;
            });

            if (sortBy === 'price-low') {
                filteredProducts.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
                filteredProducts.sort((a, b) => b.price - a.price);
            }

            renderProducts(filteredProducts);
        };

        // Event Listeners for Filters
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                filterAndRender();
            });
        });

        document.getElementById('searchInput').addEventListener('input', filterAndRender);
        document.getElementById('sortSelect').addEventListener('change', filterAndRender);

        // Initial Load
        showSkeletons();
        setTimeout(() => {
            renderProducts(productsData);
        }, 1500);
    }

    function attachProductListeners() {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.fav-btn') || e.target.closest('.add-cart-btn')) return;
                window.location.href = `product-details.html?id=${card.dataset.id}`;
            });
            // (Re-attach fav and cart logic similarly if needed, or use delegation)
        });
    }

    // 7. Professional Product Details Page Logic
    const mainImg = document.getElementById('mainImg');
    const thumbnails = document.querySelectorAll('.thumb');
    
    if (thumbnails.length > 0) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImg.src = thumb.querySelector('img').src;
            });
        });
    }

    // Accordion Logic
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            item.classList.toggle('active');
        });
    });

    // 8. Global Auth Modal Logic
    let simulatedUser = null;

    const injectAuthModal = () => {
        if (document.querySelector('.auth-modal-overlay')) return;

        const modalHTML = `
            <div class="auth-modal-overlay">
                <div class="auth-modal">
                    <h2 class="serif">Please Login First</h2>
                    <p>Login to continue your premium shopping experience at CHENARI.</p>
                    <div class="auth-btn-group">
                        <button class="auth-btn login">Login</button>
                        <button class="auth-btn signup">Create Account</button>
                        <button class="auth-btn cancel">Maybe Later</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Attach listeners to newly injected modal
        const overlay = document.querySelector('.auth-modal-overlay');
        const loginBtn = overlay.querySelector('.auth-btn.login');
        const signupBtn = overlay.querySelector('.auth-btn.signup');
        const cancelBtn = overlay.querySelector('.auth-btn.cancel');

        loginBtn.addEventListener('click', () => {
            loginBtn.innerText = 'Redirecting...';
            setTimeout(() => {
                simulatedUser = { name: 'Guest User' };
                overlay.classList.remove('active');
                showToast('Welcome back! You are now logged in.');
                loginBtn.innerText = 'Login';
            }, 1000);
        });

        signupBtn.addEventListener('click', () => {
            showToast('Signup feature coming soon!');
        });

        cancelBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    };

    const showAuthModal = () => {
        injectAuthModal();
        setTimeout(() => {
            document.querySelector('.auth-modal-overlay').classList.add('active');
        }, 10);
    };

    // Global Event Delegation for Auth-Required Actions
    document.addEventListener('click', (e) => {
        const cartBtn = e.target.closest('.add-cart-btn') || e.target.closest('.add-bag-btn');
        const favBtn = e.target.closest('.fav-btn') || e.target.closest('.save-wishlist-btn');

        if ((cartBtn || favBtn) && !simulatedUser) {
            e.preventDefault();
            e.stopPropagation();
            showAuthModal();
        } else if (cartBtn && simulatedUser) {
            // Extract product details based on page context
            let product = { id: Date.now(), name: "Premium Item", price: 1000, image: "assets/images/default.png", category: "Accessories", desc: "Exclusive piece from the CHENARI Atelier collection." };
            
            const card = cartBtn.closest('.product-card');
            if (card) {
                // We are on product listing page
                product.name = card.querySelector('h3').innerText;
                product.price = parseFloat(card.querySelector('.current-price').innerText.replace('$', '').replace(',', ''));
                product.image = card.querySelector('img').src;
                const catSpan = card.querySelector('.product-category');
                if (catSpan) product.category = catSpan.innerText;
                product.id = product.name.replace(/\s+/g, '-').toLowerCase();
            } else if (document.querySelector('.details-title')) {
                // We are on product details page
                product.name = document.querySelector('.details-title').innerText;
                product.price = parseFloat(document.querySelector('.details-price').innerText.replace('$', '').replace(',', ''));
                product.image = document.querySelector('.main-image-wrapper img').src;
                product.id = product.name.replace(/\s+/g, '-').toLowerCase();
            }

            if (window.addToCart) {
                window.addToCart(product);
            } else {
                showToast('Item added to your shopping bag!');
            }
        } else if (favBtn && simulatedUser) {
            // Extract product details
            let product = { id: Date.now(), name: "Premium Item", price: 1000, image: "assets/images/default.png", category: "Accessories", desc: "Exclusive piece from the CHENARI Atelier collection." };
            
            const card = favBtn.closest('.product-card');
            if (card) {
                product.name = card.querySelector('h3').innerText;
                product.price = parseFloat(card.querySelector('.current-price').innerText.replace('$', '').replace(',', ''));
                product.image = card.querySelector('img').src;
                const catSpan = card.querySelector('.product-category');
                if (catSpan) product.category = catSpan.innerText;
                product.id = product.name.replace(/\s+/g, '-').toLowerCase();
            } else if (document.querySelector('.details-title')) {
                product.name = document.querySelector('.details-title').innerText;
                product.price = parseFloat(document.querySelector('.details-price').innerText.replace('$', '').replace(',', ''));
                product.image = document.querySelector('.main-image-wrapper img').src;
                product.id = product.name.replace(/\s+/g, '-').toLowerCase();
            }

            if (window.handleFavClick) {
                window.handleFavClick(favBtn, product);
            } else {
                // Fallback toggle
                favBtn.classList.toggle('active');
                const icon = favBtn.querySelector('i');
                if (favBtn.classList.contains('active')) {
                    icon.classList.replace('far', 'fas');
                    showToast('Added to Wishlist!');
                } else {
                    icon.classList.replace('fas', 'far');
                }
            }
        }
    });
});
