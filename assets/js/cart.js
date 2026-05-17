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

    // Atomic Checkout and Stock Deduction Listener
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (!currentUser) {
                window.showToast('Please login to place an order.', 'error');
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            // Get items currently in the cart
            const cartRef = collection(db, `users/${currentUser.uid}/cart`);
            const cartSnap = await getDocs(cartRef);
            const cartItems = [];
            cartSnap.forEach(docSnap => {
                cartItems.push({ id: docSnap.id, ...docSnap.data() });
            });

            if (cartItems.length === 0) {
                window.showToast('Your shopping bag is empty.', 'error');
                return;
            }

            try {
                checkoutBtn.disabled = true;
                checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

                // 1. Verify and transactionally check stock for all products
                const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const batch = writeBatch(db);

                for (const item of cartItems) {
                    const productRef = doc(db, 'products', item.id);
                    const productSnap = await getDoc(productRef);
                    if (!productSnap.exists()) {
                        throw new Error(`Product ${item.title} no longer exists in the collection.`);
                    }

                    const productData = productSnap.data();
                    const currentStock = productData.stock || 0;
                    if (currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for "${item.title}". Only ${currentStock} remaining.`);
                    }

                    // Calculate updated stocks and sales
                    const newStock = currentStock - item.quantity;
                    const newSold = (productData.sold || 0) + item.quantity;

                    // Queue updates in writeBatch
                    batch.update(productRef, {
                        stock: newStock,
                        sold: newSold
                    });
                }

                // 2. Generate a random unique Order ID
                const randomId = Math.floor(1000 + Math.random() * 9000);
                const orderIdStr = `ORD-${randomId}`;

                // Calculate summary details
                const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const tax = subtotal * 0.08;
                const shipping = subtotal > 0 ? 45 : 0;
                const grandTotal = subtotal + tax + shipping;

                // 3. Get user details for order documentation
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : {};
                const customerName = userData.name || userData.displayName || currentUser.displayName || 'Luxury Client';
                const customerEmail = userData.email || currentUser.email || 'guest@example.com';
                const customerAddress = userData.address || 'Atelier Premium Delivery Address';

                // 4. Create Order document in global orders collection
                const newOrderRef = doc(collection(db, 'orders'));
                const orderDocData = {
                    orderId: orderIdStr,
                    userId: currentUser.uid,
                    customerUid: currentUser.uid, // Add this for profile.js compatibility
                    customerName: customerName,
                    client: {
                        name: customerName,
                        email: customerEmail,
                        address: customerAddress
                    },
                    items: cartItems.map(item => ({
                        productId: item.id,
                        title: item.title,
                        price: item.price,
                        qty: item.quantity,
                        image: item.image
                    })),
                    total: grandTotal,
                    subtotal: subtotal,
                    shipping: shipping,
                    status: 'Pending',
                    date: new Date(),
                    createdAt: serverTimestamp()
                };

                // Queue order creation in writeBatch
                batch.set(newOrderRef, orderDocData);

                // 5. Queue clearing the cart items
                for (const item of cartItems) {
                    const cartItemRef = doc(db, `users/${currentUser.uid}/cart`, item.id);
                    batch.delete(cartItemRef);
                }

                // 6. Commit the entire transaction atomically!
                await batch.commit();

                // 7. Show success feedback
                window.showToast('Order Placed Successfully! Thank you.');
                
                // Clear cart badge
                const badges = document.querySelectorAll('.fa-shopping-cart + .badge, .fa-shopping-bag + .badge');
                badges.forEach(badge => {
                    badge.innerText = '0';
                    badge.style.display = 'none';
                });

                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 2000);

            } catch (error) {
                console.error("Checkout Failure:", error);
                window.showToast(error.message || 'Checkout failed. Please try again.', 'error');
            } finally {
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = 'Proceed to Checkout';
            }
        });
    }
});
