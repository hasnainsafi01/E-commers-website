// CHENARI Favorites Engine
document.addEventListener('DOMContentLoaded', () => {
    let favorites = JSON.parse(localStorage.getItem('chenari_favorites')) || [];
    
    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavoritesUI = document.getElementById('emptyFavoritesUI');
    const favCountDisplay = document.getElementById('favCountDisplay');

    function init() {
        if (favoritesGrid) {
            renderFavorites();
        }
        updateFavoritesBadge();
    }

    // Global Add/Remove to Favorites
    window.toggleFavorite = (product, btnElement) => {
        const existingIndex = favorites.findIndex(item => item.id === product.id);
        const icon = btnElement.querySelector('i');
        
        if (existingIndex > -1) {
            // Remove
            favorites.splice(existingIndex, 1);
            btnElement.classList.remove('active');
            if (icon) icon.classList.replace('fas', 'far');
            showToast('Removed from Wishlist');
            
            // If we are on the favorites page, trigger removal animation
            if (favoritesGrid) {
                const card = btnElement.closest('.product-card');
                if (card) {
                    card.classList.add('removing');
                    setTimeout(() => renderFavorites(), 400);
                }
            }
        } else {
            // Add
            favorites.push(product);
            btnElement.classList.add('active');
            if (icon) icon.classList.replace('far', 'fas');
            showToast('Added to Wishlist!');
        }
        
        saveFavorites();
        updateFavoritesBadge();
    };

    function saveFavorites() {
        localStorage.setItem('chenari_favorites', JSON.stringify(favorites));
    }

    function updateFavoritesBadge() {
        const badges = document.querySelectorAll('.fa-heart + .badge');
        const count = favorites.length;
        badges.forEach(badge => {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        });
        
        // Update subtitle on favorites page if it exists
        if (favCountDisplay) {
            favCountDisplay.innerText = `${count} ITEM${count !== 1 ? 'S' : ''} SAVED`;
        }
    }

    function renderFavorites() {
        if (favorites.length === 0) {
            emptyFavoritesUI.classList.remove('hidden');
            favoritesGrid.classList.add('hidden');
            return;
        }

        emptyFavoritesUI.classList.add('hidden');
        favoritesGrid.classList.remove('hidden');
        favoritesGrid.innerHTML = '';

        favorites.forEach(item => {
            const itemHTML = `
                <div class="product-card favorite-card" data-id="${item.id}">
                    <div class="product-image">
                        <button class="fav-btn active" title="Remove from Wishlist" onclick='handleFavClick(this, ${JSON.stringify(item)})'>
                            <i class="fas fa-heart"></i>
                        </button>
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="product-info">
                        <span class="product-category">${item.category}</span>
                        <h3 class="product-name">${item.name}</h3>
                        <div class="product-footer" style="margin-top: 15px;">
                            <div class="product-price">
                                <span class="current-price">$${item.price.toLocaleString()}</span>
                            </div>
                            <button class="add-cart-btn" title="Move to Cart" onclick='moveToCart(${JSON.stringify(item)})'>
                                <i class="fas fa-shopping-bag"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            favoritesGrid.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    // Global helper for the onclick attribute
    window.handleFavClick = (btn, productData) => {
        if (window.toggleFavorite) {
            window.toggleFavorite(productData, btn);
        }
    };

    // Helper to move item to cart
    window.moveToCart = (product) => {
        if (window.addToCart) {
            window.addToCart(product);
            // Optionally remove from favorites after adding to cart
            // window.toggleFavorite(product, document.querySelector(`.favorite-card[data-id="${product.id}"] .fav-btn`));
        } else {
            showToast('Shopping Bag engine not loaded!');
        }
    };

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
