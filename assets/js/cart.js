import { db, auth } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let cartUnsubscribe = null;

    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCartUI = document.getElementById('emptyCartUI');
    const cartContent = document.getElementById('cartContent');

    const injectCheckoutGuardModal = () => {
        if (document.getElementById('checkoutGuardModal')) return;
        const modalHTML = `
            <div id="checkoutGuardModal" class="auth-modal-overlay">
                <div class="auth-modal-content" style="text-align: center; max-width: 450px;">
                    <div style="font-size: 3rem; color: var(--primary-red); margin-bottom: 15px;">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <h2 class="serif" style="margin-bottom: 10px;">Complete Your Delivery Information</h2>
                    <p style="color: #666; margin-bottom: 25px; font-size: 0.95rem; line-height: 1.5;">
                        Please complete your delivery address and contact information securely before placing an order.
                    </p>
                    <div style="display: flex; gap: 15px;">
                        <button class="btn-secondary" id="checkoutGuardCancel" style="flex: 1; margin: 0;">Cancel</button>
                        <button class="login-btn" id="checkoutGuardProceed" style="flex: 1; margin: 0;">Complete Profile</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('checkoutGuardCancel').onclick = () => {
            document.getElementById('checkoutGuardModal').classList.remove('active');
        };
        document.getElementById('checkoutGuardProceed').onclick = () => {
            sessionStorage.setItem('chenari_return_to_cart', 'true');
            window.location.href = 'profile.html';
        };
    };

    window.showCheckoutGuardModal = () => {
        injectCheckoutGuardModal();
        setTimeout(() => {
            document.getElementById('checkoutGuardModal').classList.add('active');
        }, 50);
    };

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            startCartListener(user.uid);
        } else {
            if (cartUnsubscribe) cartUnsubscribe();
            updateUI([]); // Reset UI
            
            // Protect Cart page access
            if (window.location.pathname.includes('cart.html')) {
                window.showToast("Please login first", "error");
                sessionStorage.setItem('chenari_trigger_login_modal', 'true');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        }
    });

    const startCartListener = (uid) => {
        if (window.updateChenariLoaderText) {
            window.updateChenariLoaderText("Curating Shopping Collection...");
        }
        const cartRef = collection(db, `cart/${uid}/items`);
        cartUnsubscribe = onSnapshot(cartRef, (snapshot) => {
            const items = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            updateUI(items);
            if (window.hideChenariLoader) {
                window.hideChenariLoader();
            }
        }, (err) => {
            console.error("Cart fetch error:", err);
            if (window.hideChenariLoader) {
                window.hideChenariLoader();
            }
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
            const oldCount = parseInt(badge.innerText) || 0;
            badge.innerText = count;
            badge.style.display = count > 0 ? 'block' : 'none';
            
            // Luxurious scale/bounce animation on badge update
            if (oldCount !== count) {
                const icon = badge.parentElement.querySelector('i');
                if (icon) {
                    icon.style.transform = 'scale(1.3)';
                    icon.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    setTimeout(() => {
                        icon.style.transform = 'scale(1)';
                    }, 250);
                }
            }
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
                        <img src="${item.image}" alt="${item.title || item.name}">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-header">
                            <h3 class="serif">${item.title || item.name}</h3>
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
        if (!currentUser) {
            if (window.showLoginRequiredModal) {
                window.showLoginRequiredModal({ type: 'cart', data: product });
            } else {
                window.showToast('Please login first', 'error');
            }
            return;
        }

        if (window.updateChenariLoaderText) {
            window.updateChenariLoaderText("Adding to Collection...");
        }

        const itemRef = doc(db, `cart/${currentUser.uid}/items`, product.id);
        
        try {
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
                            productId: product.id,
                            id: product.id,
                            title: pData.title,
                            name: pData.title,
                            price: pData.price,
                            category: pData.category,
                            image: pData.images[0],
                            quantity: 1,
                            createdAt: serverTimestamp(),
                            addedAt: serverTimestamp()
                        };
                    }
                } else {
                    fullProduct = {
                        productId: product.id || product.productId,
                        id: product.id || product.productId,
                        title: product.title || product.name,
                        name: product.title || product.name,
                        price: product.price,
                        category: product.category,
                        image: product.image,
                        quantity: product.quantity || 1,
                        createdAt: serverTimestamp(),
                        addedAt: serverTimestamp()
                    };
                }
                await setDoc(itemRef, fullProduct);
            }
            window.showToast('Added to Cart');
        } catch (e) {
            console.error("Cart save error:", e);
            window.showToast("Failed to save to Cart", "error");
        } finally {
            if (window.hideChenariLoader) {
                window.hideChenariLoader();
            }
        }
    };

    const changeQty = async (id, delta) => {
        if (window.updateChenariLoaderText) {
            window.updateChenariLoaderText("Updating Quantity...");
        }
        try {
            const itemRef = doc(db, `cart/${currentUser.uid}/items`, id);
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
                let newQty = itemSnap.data().quantity + delta;
                if (newQty < 1) newQty = 1;
                await setDoc(itemRef, { quantity: newQty }, { merge: true });
            }
        } catch (e) {
            console.error("Qty update error:", e);
        } finally {
            if (window.hideChenariLoader) {
                window.hideChenariLoader();
            }
        }
    };

    const removeFromCart = async (id) => {
        if (window.updateChenariLoaderText) {
            window.updateChenariLoaderText("Removing Item...");
        }
        try {
            const itemRef = doc(db, `cart/${currentUser.uid}/items`, id);
            await deleteDoc(itemRef);
            window.showToast('Removed from Cart');
        } catch (e) {
            console.error("Remove error:", e);
            window.showToast("Failed to remove item", "error");
        } finally {
            if (window.hideChenariLoader) {
                window.hideChenariLoader();
            }
        }
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

            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

            try {
                // STEP 1: Verify Profile Completion - block checkout if delivery info is missing
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : null;

                // Validate BOTH the flag AND every individual required field.
                // This prevents stale flags from allowing checkout with incomplete data.
                const requiredDeliveryFields = ['phone', 'country', 'city', 'streetAddress', 'houseNumber'];
                const missingFields = requiredDeliveryFields.filter(f => !userData?.[f] || userData[f].trim() === '');
                const isProfileIncomplete = !userData || !userData.profileCompleted || missingFields.length > 0;

                if (isProfileIncomplete) {
                    checkoutBtn.disabled = false;
                    checkoutBtn.innerHTML = 'Proceed to Checkout';

                    if (window.showCheckoutGuardModal) {
                        // Flag is set inside the modal's 'Complete Profile' button onclick
                        window.showCheckoutGuardModal();
                    } else {
                        // Fallback: set flag and redirect directly
                        sessionStorage.setItem('chenari_return_to_cart', 'true');
                        window.showToast('Please complete your delivery address first.', 'error');
                        setTimeout(() => { window.location.href = 'profile.html'; }, 1500);
                    }
                    return;
                }

                // STEP 2: Fetch current cart items
                const cartRef = collection(db, `cart/${currentUser.uid}/items`);
                const cartSnap = await getDocs(cartRef);
                const cartItems = [];
                cartSnap.forEach(docSnap => {
                    cartItems.push({ id: docSnap.id, ...docSnap.data() });
                });

                if (cartItems.length === 0) {
                    window.showToast('Your shopping bag is empty.', 'error');
                    checkoutBtn.disabled = false;
                    checkoutBtn.innerHTML = 'Proceed to Checkout';
                    return;
                }

                // STEP 3: Verify stock for all products atomically
                const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const batch = writeBatch(db);

                for (const item of cartItems) {
                    const productRef = doc(db, 'products', item.id);
                    const productSnap = await getDoc(productRef);
                    if (!productSnap.exists()) {
                        throw new Error(`Product "${item.title || item.name}" no longer exists in the collection.`);
                    }

                    const productData = productSnap.data();
                    const currentStock = productData.stock || 0;
                    if (currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for "${item.title || item.name}". Only ${currentStock} remaining.`);
                    }

                    batch.update(productRef, {
                        stock: currentStock - item.quantity,
                        sold: (productData.sold || 0) + item.quantity
                    });
                }

                // STEP 4: Build order document with full delivery address
                const randomId = Math.floor(1000 + Math.random() * 9000);
                const orderIdStr = `ORD-${randomId}`;

                const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const tax = subtotal * 0.08;
                const shipping = subtotal > 0 ? 45 : 0;
                const grandTotal = subtotal + tax + shipping;

                const customerName = userData.name || userData.displayName || currentUser.displayName || 'Luxury Client';
                const customerEmail = userData.email || currentUser.email || 'guest@example.com';
                const customerAddressStr = `${userData.houseNumber || ''} ${userData.streetAddress || ''}, ${userData.city || ''}, ${userData.country || ''} ${userData.postalCode || ''}`.trim();

                const newOrderRef = doc(collection(db, 'orders'));
                batch.set(newOrderRef, {
                    orderId: orderIdStr,
                    userId: currentUser.uid,
                    customerUid: currentUser.uid,
                    customerName: customerName,
                    client: {
                        name: customerName,
                        email: customerEmail,
                        phone: userData.phone || '',
                        country: userData.country || '',
                        city: userData.city || '',
                        province: userData.province || '',
                        streetAddress: userData.streetAddress || '',
                        houseNumber: userData.houseNumber || '',
                        flatNumber: userData.flatNumber || '',
                        postalCode: userData.postalCode || '',
                        notes: userData.notes || '',
                        fullAddressString: customerAddressStr
                    },
                    items: cartItems.map(item => ({
                        productId: item.id,
                        title: item.title || item.name,
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
                });

                // STEP 5: Delete cart items in the same batch
                for (const item of cartItems) {
                    batch.delete(doc(db, `cart/${currentUser.uid}/items`, item.id));
                }

                // STEP 6: Atomic commit
                await batch.commit();

                // STEP 7: Success
                window.showToast('Order Placed Successfully! Thank you.');
                document.querySelectorAll('.fa-shopping-cart + .badge, .fa-shopping-bag + .badge').forEach(badge => {
                    badge.innerText = '0';
                    badge.style.display = 'none';
                });
                setTimeout(() => { window.location.href = 'profile.html'; }, 2000);

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

