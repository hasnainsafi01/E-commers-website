import { db, auth } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let favUnsubscribe = null;
    let userFavs = new Set();

    const favoritesGrid = document.getElementById('favoritesGrid');
    const emptyFavoritesUI = document.getElementById('emptyFavoritesUI');
    const favCountDisplay = document.getElementById('favCountDisplay');

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            startFavListener(user.uid);
        } else {
            if (favUnsubscribe) favUnsubscribe();
            userFavs.clear();
            updateUI([]);
            
            // Protect Favorites page access
            if (window.location.pathname.includes('favorites.html')) {
                window.showToast("Please login first", "error");
                sessionStorage.setItem('mymart_trigger_login_modal', 'true');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        }
    });

    const startFavListener = (uid) => {
        if (window.updateMyMartLoaderText) {
            window.updateMyMartLoaderText("Recalling Saved Timepieces...");
        }
        const favRef = collection(db, `favorites/${uid}/items`);
        favUnsubscribe = onSnapshot(favRef, (snapshot) => {
            const items = [];
            userFavs.clear();
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
                userFavs.add(doc.id);
            });
            updateUI(items);
            syncHeartIcons();
            if (window.hideMyMartLoader) {
                window.hideMyMartLoader();
            }
        }, (err) => {
            console.error("Favorites fetch error:", err);
            if (window.hideMyMartLoader) {
                window.hideMyMartLoader();
            }
        });
    };

    const updateUI = (items) => {
        updateFavoritesBadge(items.length);
        if (favoritesGrid) renderFavorites(items);
    };

    const updateFavoritesBadge = (count) => {
        const badges = document.querySelectorAll('.fa-heart + .badge');
        badges.forEach(badge => {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        });
        if (favCountDisplay) favCountDisplay.innerText = `${count} ITEM${count !== 1 ? 'S' : ''} SAVED`;
    };

    const syncHeartIcons = () => {
        document.querySelectorAll('.fav-btn').forEach(btn => {
            const card = btn.closest('.product-card');
            if (card) {
                const id = card.dataset.id;
                const icon = btn.querySelector('i');
                if (userFavs.has(id)) {
                    btn.classList.add('active');
                    if (icon) {
                        icon.className = 'fas fa-heart';
                    }
                } else {
                    btn.classList.remove('active');
                    if (icon) {
                        icon.className = 'far fa-heart';
                    }
                }
            }
        });
    };

    const renderFavorites = (items) => {
        if (items.length === 0) {
            emptyFavoritesUI?.classList.remove('hidden');
            favoritesGrid?.classList.add('hidden');
            return;
        }

        emptyFavoritesUI?.classList.add('hidden');
        favoritesGrid?.classList.remove('hidden');
        favoritesGrid.innerHTML = '';

        items.forEach(item => {
            const itemHTML = `
                <div class="product-card favorite-card" data-id="${item.id}">
                    <div class="product-image">
                        <button class="fav-btn active" title="Remove from Wishlist">
                            <i class="fas fa-heart"></i>
                        </button>
                        <img src="${item.image}" alt="${item.title || item.name}">
                    </div>
                    <div class="product-info">
                        <span class="product-category">${item.category}</span>
                        <h3 class="product-name">${item.title || item.name}</h3>
                        <div class="product-footer" style="margin-top: 15px;">
                            <div class="product-price">
                                <span class="current-price">PKR ${item.price.toLocaleString()}</span>
                            </div>
                            <button class="add-cart-btn" title="Move to Cart"><i class="fas fa-shopping-bag"></i></button>
                        </div>
                    </div>
                </div>
            `;
            favoritesGrid.insertAdjacentHTML('beforeend', itemHTML);
        });

        // Attach listeners
        favoritesGrid.querySelectorAll('.fav-btn').forEach(btn => {
            btn.onclick = () => {
                const card = btn.closest('.product-card');
                window.handleFavClick(btn, { id: card.dataset.id, title: card.querySelector('.product-name').innerText });
            };
        });
        favoritesGrid.querySelectorAll('.add-cart-btn').forEach(btn => {
            btn.onclick = () => {
                const card = btn.closest('.product-card');
                const id = card.dataset.id;
                const title = card.querySelector('.product-name').innerText;
                if (window.addToCart) window.addToCart({ id, title });
            };
        });
    };

    window.handleFavClick = async (btn, product) => {
        if (!currentUser) {
            if (window.showLoginRequiredModal) {
                window.showLoginRequiredModal({ type: 'fav', data: product });
            } else {
                window.showToast('Please login first', 'error');
            }
            return;
        }

        if (window.updateMyMartLoaderText) {
            window.updateMyMartLoaderText("Updating wishlist...");
        }

        const favRef = doc(db, `favorites/${currentUser.uid}/items`, product.id);
        
        try {
            if (userFavs.has(product.id)) {
                await deleteDoc(favRef);
                if (btn) {
                    btn.classList.remove('active');
                    const icon = btn.querySelector('i');
                    if (icon) icon.className = 'far fa-heart';
                }
                window.showToast('Removed from Favorites');
            } else {
                // Fetch full details if needed
                let fullProduct = product;
                if (!product.price || !product.image) {
                    const pSnap = await getDoc(doc(db, 'products', product.id));
                    if (pSnap.exists()) {
                        const d = pSnap.data();
                        fullProduct = {
                            productId: product.id,
                            id: product.id,
                            title: d.title,
                            name: d.title,
                            price: d.price,
                            category: d.category,
                            image: d.images[0],
                            quantity: 1,
                            createdAt: serverTimestamp()
                        };
                    }
                } else {
                    fullProduct = {
                        productId: product.id,
                        id: product.id,
                        title: product.title || product.name,
                        name: product.title || product.name,
                        price: product.price,
                        category: product.category,
                        image: product.image,
                        quantity: 1,
                        createdAt: serverTimestamp()
                    };
                }
                await setDoc(favRef, fullProduct);
                if (btn) {
                    btn.classList.add('active');
                    const icon = btn.querySelector('i');
                    if (icon) icon.className = 'fas fa-heart';
                    
                    // Luxury scale bounce animation on favorite click
                    btn.style.transform = 'scale(1.3)';
                    setTimeout(() => btn.style.transform = 'scale(1)', 200);
                }
                window.showToast('Added to Favorites');
            }
        } catch (e) {
            console.error("Wishlist operation failed:", e);
            window.showToast("Failed to save Favorite", "error");
        } finally {
            if (window.hideMyMartLoader) {
                window.hideMyMartLoader();
            }
        }
    };
});
