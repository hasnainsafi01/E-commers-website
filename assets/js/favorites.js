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
        }
    });

    const startFavListener = (uid) => {
        const favRef = collection(db, `users/${uid}/favorites`);
        favUnsubscribe = onSnapshot(favRef, (snapshot) => {
            const items = [];
            userFavs.clear();
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
                userFavs.add(doc.id);
            });
            updateUI(items);
            syncHeartIcons();
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
                    icon.classList.replace('far', 'fas');
                } else {
                    btn.classList.remove('active');
                    icon.classList.replace('fas', 'far');
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
                        <img src="${item.image}" alt="${item.title}">
                    </div>
                    <div class="product-info">
                        <span class="product-category">${item.category}</span>
                        <h3 class="product-name">${item.title}</h3>
                        <div class="product-footer" style="margin-top: 15px;">
                            <div class="product-price">
                                <span class="current-price">$${item.price.toLocaleString()}</span>
                            </div>
                            <button class="add-cart-btn" title="Move to Bag"><i class="fas fa-shopping-bag"></i></button>
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
        if (!currentUser) return;
        const favRef = doc(db, `users/${currentUser.uid}/favorites`, product.id);
        
        if (userFavs.has(product.id)) {
            await deleteDoc(favRef);
            window.showToast('Removed from wishlist.');
        } else {
            // Fetch full details if needed
            let fullProduct = product;
            if (!product.price) {
                const pSnap = await getDoc(doc(db, 'products', product.id));
                if (pSnap.exists()) {
                    const d = pSnap.data();
                    fullProduct = { id: product.id, title: d.title, price: d.price, category: d.category, image: d.images[0], addedAt: serverTimestamp() };
                }
            }
            await setDoc(favRef, fullProduct);
            window.showToast('Saved to your wishlist.');
        }
    };
});
