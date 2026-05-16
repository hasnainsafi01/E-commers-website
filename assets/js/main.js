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
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileToggle.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.replace('fa-bars', 'fa-times');
        } else {
            icon.classList.replace('fa-times', 'fa-bars');
        }
    });

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

    themeToggle.addEventListener('click', () => {
        const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

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
});
