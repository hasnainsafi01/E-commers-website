// CHENARI Cart Engine
document.addEventListener('DOMContentLoaded', () => {
    let cart = JSON.parse(localStorage.getItem('chenari_cart')) || [];
    
    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCartUI = document.getElementById('emptyCartUI');
    const cartContent = document.getElementById('cartContent');
    const cartSubtitle = document.querySelector('.cart-subtitle');

    // Initialize Page
    function init() {
        if (cartItemsList) {
            renderCart();
        }
        updateCartBadge();
    }

    // Global Add to Cart
    window.addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        saveCart();
        updateCartBadge();
        showToast('Added to your shopping bag!');
    };

    function saveCart() {
        localStorage.setItem('chenari_cart', JSON.stringify(cart));
    }

    function updateCartBadge() {
        const badges = document.querySelectorAll('.fa-shopping-cart + .badge, .fa-shopping-bag + .badge');
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        badges.forEach(badge => {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        });
    }

    function renderCart() {
        if (cart.length === 0) {
            emptyCartUI.classList.remove('hidden');
            cartContent.classList.add('hidden');
            return;
        }

        emptyCartUI.classList.add('hidden');
        cartContent.classList.remove('hidden');
        cartItemsList.innerHTML = '';

        cart.forEach(item => {
            const itemHTML = `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-header">
                            <h3 class="serif">${item.name}</h3>
                            <span class="cart-item-price">$${item.price.toLocaleString()}.00</span>
                        </div>
                        <span class="cart-item-details">${item.category} / Premium Edition</span>
                        <p class="cart-item-desc">${item.desc || 'Exclusive piece from the CHENARI Atelier collection.'}</p>
                        <div class="cart-item-actions">
                            <div class="quantity-selector">
                                <button class="qty-btn minus" onclick="changeQty(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                                <span class="qty-val">${item.quantity}</span>
                                <button class="qty-btn plus" onclick="changeQty(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                            </div>
                            <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-trash-alt"></i> REMOVE</button>
                        </div>
                    </div>
                </div>
            `;
            cartItemsList.insertAdjacentHTML('beforeend', itemHTML);
        });

        updateSummary();
    }

    window.changeQty = (id, delta) => {
        const item = cart.find(i => i.id === id);
        if (item) {
            item.quantity += delta;
            if (item.quantity < 1) item.quantity = 1;
            saveCart();
            renderCart();
            updateCartBadge();
        }
    };

    window.removeFromCart = (id) => {
        const itemElement = document.querySelector(`.cart-item[data-id="${id}"]`);
        itemElement.classList.add('removing');
        
        setTimeout(() => {
            cart = cart.filter(item => item.id !== id);
            saveCart();
            renderCart();
            updateCartBadge();
        }, 400);
    };

    function updateSummary() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.08;
        const shipping = subtotal > 0 ? 45 : 0;
        const total = subtotal + tax + shipping;

        document.getElementById('subtotal').innerText = `$${subtotal.toLocaleString()}.00`;
        document.getElementById('grandTotal').innerText = `$${total.toLocaleString()}.00`;
        
        if (cartSubtitle) {
            const count = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartSubtitle.innerText = `${count} ITEM${count !== 1 ? 'S' : ''} READY FOR DELIVERY`;
        }
    }

    // Helper: Toast (if not already defined)
    function showToast(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        } else {
            console.log("Toast:", msg);
        }
    }

    init();
});
