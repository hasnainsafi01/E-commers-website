import { db, auth } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let cartUnsubscribe = null;

    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCartUI = document.getElementById('emptyCartUI');
    const cartContent = document.getElementById('cartContent');

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            startCartListener(user.uid);
        } else {
            if (cartUnsubscribe) cartUnsubscribe();
            updateUI([]); // Reset UI
        }
    });

    const startCartListener = (uid) => {
        const cartRef = collection(db, `users/${uid}/cart`);
        cartUnsubscribe = onSnapshot(cartRef, (snapshot) => {
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            updateUI(items);
        });
    };

    const updateUI = (items) => {
        updateCartBadge(items);
        if (cartItemsList) renderCart(items);
    };

    const updateCartBadge = (items) => {
        const badges = document.querySelectorAll('.fa-shopping-cart + .badge, .fa-shopping-bag + .badge');
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        badges.forEach(badge => {
            badge.innerText = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        });
    };

    const renderCart = (items) => {
        if (items.length === 0) {
            emptyCartUI?.classList.remove('hidden');
            cartContent?.classList.add('hidden');
            return;
        }

        emptyCartUI?.classList.add('hidden');
        cartContent?.classList.remove('hidden');
        cartItemsList.innerHTML = '';

        items.forEach(item => {
            const itemHTML = `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.title}">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-header">
                            <h3 class="serif">${item.title}</h3>
                            <span class="cart-item-price">$${item.price.toLocaleString()}</span>
                        </div>
                        <span class="cart-item-details">${item.category} / Authentic Piece</span>
                        <div class="cart-item-actions">
                            <div class="quantity-selector">
                                <button class="qty-btn minus" data-id="${item.id}" data-delta="-1"><i class="fas fa-minus"></i></button>
                                <span class="qty-val">${item.quantity}</span>
                                <button class="qty-btn plus" data-id="${item.id}" data-delta="1"><i class="fas fa-plus"></i></button>
                            </div>
                            <button class="remove-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i> REMOVE</button>
                        </div>
                    </div>
                </div>
            `;
            cartItemsList.insertAdjacentHTML('beforeend', itemHTML);
        });

        // Attach local listeners for buttons
        cartItemsList.querySelectorAll('.qty-btn').forEach(btn => {
            btn.onclick = () => changeQty(btn.dataset.id, parseInt(btn.dataset.delta));
        });
        cartItemsList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = () => removeFromCart(btn.dataset.id);
        });

        updateSummary(items);
    };

    const updateSummary = (items) => {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.08;
        const shipping = subtotal > 0 ? 45 : 0;
        const total = subtotal + tax + shipping;

        const subtotalEl = document.getElementById('subtotal');
        const grandTotalEl = document.getElementById('grandTotal');
        if (subtotalEl) subtotalEl.innerText = `$${subtotal.toLocaleString()}.00`;
        if (grandTotalEl) grandTotalEl.innerText = `$${total.toLocaleString()}.00`;
    };

    // Exported Global Actions
    window.addToCart = async (product) => {
        if (!currentUser) return;
        const itemRef = doc(db, `users/${currentUser.uid}/cart`, product.id);
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
            await setDoc(itemRef, { quantity: itemSnap.data().quantity + 1 }, { merge: true });
        } else {
            // Fetch full product details if only ID/Title provided
            let fullProduct = product;
            if (!product.price || !product.image) {
                const pSnap = await getDoc(doc(db, 'products', product.id));
                if (pSnap.exists()) {
                    const pData = pSnap.data();
                    fullProduct = {
                        id: product.id,
                        title: pData.title,
                        price: pData.price,
                        category: pData.category,
                        image: pData.images[0],
                        quantity: 1,
                        addedAt: serverTimestamp()
                    };
                }
            }
            await setDoc(itemRef, fullProduct);
        }
        window.showToast('Added to your collection.');
    };

    const changeQty = async (id, delta) => {
        const itemRef = doc(db, `users/${currentUser.uid}/cart`, id);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
            let newQty = itemSnap.data().quantity + delta;
            if (newQty < 1) newQty = 1;
            await setDoc(itemRef, { quantity: newQty }, { merge: true });
        }
    };

    const removeFromCart = async (id) => {
        const itemRef = doc(db, `users/${currentUser.uid}/cart`, id);
        await deleteDoc(itemRef);
        window.showToast('Removed from collection.');
    };
});
