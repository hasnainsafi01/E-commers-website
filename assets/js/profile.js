import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CLOUD_NAME = "dqsvcn94y";
const UPLOAD_PRESET = "E-commerce";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

let currentUserDoc = null;
let currentAuthUser = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        currentAuthUser = user;

        // Synchronously load cached user data to prevent profile layout reset/flicker
        const cachedUserString = localStorage.getItem('mymart_logged_in_user');
        if (cachedUserString) {
            try {
                const cachedUser = JSON.parse(cachedUserString);
                if (document.getElementById('userProfileName')) {
                    document.getElementById('userProfileName').innerText = cachedUser.displayName || 'Luxury Connoisseur';
                }
                if (document.getElementById('userProfileEmail')) {
                    document.getElementById('userProfileEmail').innerText = cachedUser.email;
                }
                if (document.getElementById('userProfileImage')) {
                    document.getElementById('userProfileImage').src = cachedUser.photoURL;
                }
                if (document.getElementById('editFullName')) {
                    document.getElementById('editFullName').value = cachedUser.displayName || 'Luxury Connoisseur';
                }
                if (document.getElementById('editEmail')) {
                    document.getElementById('editEmail').value = cachedUser.email;
                }
                if (document.getElementById('editModalImagePreview')) {
                    document.getElementById('editModalImagePreview').src = cachedUser.photoURL;
                }
            } catch (e) {
                console.warn("Failed to apply cached profile session:", e);
            }
        }

        // 1. Real-Time User Data Sync
        const userRef = doc(db, 'users', user.uid);
        
        onSnapshot(userRef, (userSnap) => {
            currentUserDoc = userSnap.exists() ? userSnap.data() : {};
            
            // Prefer strictly requested 'name', fallback to displayName
            const displayName = currentUserDoc.name || currentUserDoc.displayName || user.displayName || 'Luxury Connoisseur';
            const photoURL = currentUserDoc.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

            // 2. Update Basic Info Real-Time
            if (document.getElementById('userProfileName')) document.getElementById('userProfileName').innerText = displayName;
            if (document.getElementById('userProfileEmail')) document.getElementById('userProfileEmail').innerText = user.email;
            if (document.getElementById('userProfileImage')) document.getElementById('userProfileImage').src = photoURL;
            
            // Check Profile Completion logic
            let filledCount = 0;
            if (displayName && displayName !== 'Luxury Connoisseur' && displayName.trim() !== '') filledCount++;
            if (photoURL && !photoURL.includes('ui-avatars.com')) filledCount++;
            if (currentUserDoc.phone && currentUserDoc.phone.trim() !== '') filledCount++;
            if (currentUserDoc.country && currentUserDoc.country.trim() !== '') filledCount++;
            if (currentUserDoc.city && currentUserDoc.city.trim() !== '') filledCount++;
            if (currentUserDoc.streetAddress && currentUserDoc.streetAddress.trim() !== '') filledCount++;
            
            const completionPercentage = Math.round((filledCount / 6) * 100);
            
            // Update UI Sidebar Progress
            if (document.getElementById('profileProgressText')) {
                document.getElementById('profileProgressText').innerText = `${completionPercentage}%`;
                document.getElementById('profileProgressFill').style.width = `${completionPercentage}%`;
                
                if (completionPercentage === 100) {
                    document.getElementById('profileProgressWarning').style.display = 'none';
                    document.getElementById('profileProgressFill').style.background = '#28a745'; // Green when complete
                    document.getElementById('profileProgressText').style.color = '#28a745';
                } else {
                    document.getElementById('profileProgressWarning').style.display = 'block';
                    document.getElementById('profileProgressFill').style.background = 'var(--primary-blue)';
                    document.getElementById('profileProgressText').style.color = 'var(--primary-blue)';
                }
            }

            // Populate edit modal (only if modal is not currently active to prevent typing interruptions)
            const editModal = document.getElementById('editProfileModal');
            if (editModal && !editModal.classList.contains('active')) {
                document.getElementById('editFullName').value = displayName;
                document.getElementById('editEmail').value = user.email;
                if (document.getElementById('editPhone')) document.getElementById('editPhone').value = currentUserDoc.phone || '';
                if (document.getElementById('editCountry')) document.getElementById('editCountry').value = currentUserDoc.country || '';
                if (document.getElementById('editCity')) document.getElementById('editCity').value = currentUserDoc.city || '';
                if (document.getElementById('editProvince')) document.getElementById('editProvince').value = currentUserDoc.province || '';
                if (document.getElementById('editPostalCode')) document.getElementById('editPostalCode').value = currentUserDoc.postalCode || '';
                if (document.getElementById('editStreetAddress')) document.getElementById('editStreetAddress').value = currentUserDoc.streetAddress || '';
                if (document.getElementById('editHouseNumber')) document.getElementById('editHouseNumber').value = currentUserDoc.houseNumber || '';
                if (document.getElementById('editFlatNumber')) document.getElementById('editFlatNumber').value = currentUserDoc.flatNumber || '';
                if (document.getElementById('editNotes')) document.getElementById('editNotes').value = currentUserDoc.notes || '';
                document.getElementById('editModalImagePreview').src = photoURL;

                // Auto-open modal & highlight missing fields when redirected from checkout guard
                if (sessionStorage.getItem('mymart_return_to_cart') === 'true') {
                    // Inject checkout-redirect banner inside modal if not already there
                    const modalContent = editModal.querySelector('.auth-modal-content');
                    if (modalContent && !modalContent.querySelector('#checkoutRedirectBanner')) {
                        const banner = document.createElement('div');
                        banner.id = 'checkoutRedirectBanner';
                        banner.style.cssText = `
                            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                            border: 1px solid #f6c23e;
                            border-radius: 10px;
                            padding: 14px 18px;
                            margin-bottom: 20px;
                            display: flex;
                            align-items: flex-start;
                            gap: 12px;
                            animation: bannerSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                        `;
                        banner.innerHTML = `
                            <i class="fas fa-exclamation-triangle" style="color:#856404;font-size:1.2rem;margin-top:2px;flex-shrink:0;"></i>
                            <div>
                                <strong style="color:#856404;font-size:0.88rem;display:block;margin-bottom:3px;">Delivery Information Required</strong>
                                <span style="color:#856404;font-size:0.82rem;line-height:1.5;">
                                    Please complete all required fields marked with <span style="color:#c0392b;font-weight:700;">*</span> to proceed with checkout.
                                </span>
                            </div>
                        `;
                        const modalHeader = modalContent.querySelector('.auth-modal-header');
                        if (modalHeader) {
                            modalHeader.insertAdjacentElement('afterend', banner);
                        } else {
                            modalContent.prepend(banner);
                        }

                        // Inject animation keyframes once
                        if (!document.getElementById('profileHighlightStyles')) {
                            const style = document.createElement('style');
                            style.id = 'profileHighlightStyles';
                            style.textContent = `
                                @keyframes bannerSlideIn {
                                    from { opacity: 0; transform: translateY(-10px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                                @keyframes fieldShake {
                                    0%, 100% { transform: translateX(0); }
                                    20% { transform: translateX(-6px); }
                                    40% { transform: translateX(6px); }
                                    60% { transform: translateX(-4px); }
                                    80% { transform: translateX(4px); }
                                }
                                .missing-field-highlight {
                                    border-color: #e74c3c !important;
                                    background: rgba(231, 76, 60, 0.04) !important;
                                    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.15) !important;
                                    animation: fieldShake 0.5s ease 0.3s;
                                }
                            `;
                            document.head.appendChild(style);
                        }
                    }

                    // Open the modal with smooth animation
                    editModal.classList.add('active');

                    // Highlight all missing required fields and focus the first one
                    const requiredFieldMap = [
                        { id: 'editPhone', fieldKey: 'phone' },
                        { id: 'editCountry', fieldKey: 'country' },
                        { id: 'editCity', fieldKey: 'city' },
                        { id: 'editStreetAddress', fieldKey: 'streetAddress' },
                        { id: 'editHouseNumber', fieldKey: 'houseNumber' }
                    ];
                    let firstMissingEl = null;
                    requiredFieldMap.forEach(({ id, fieldKey }) => {
                        const el = document.getElementById(id);
                        if (el) {
                            if (!currentUserDoc[fieldKey] || currentUserDoc[fieldKey].trim() === '') {
                                el.classList.add('missing-field-highlight');
                                if (!firstMissingEl) firstMissingEl = el;
                                // Remove highlight on user input
                                el.addEventListener('input', () => el.classList.remove('missing-field-highlight'), { once: true });
                            } else {
                                el.classList.remove('missing-field-highlight');
                            }
                        }
                    });

                    // Scroll modal to top, then focus first missing field
                    setTimeout(() => {
                        const modalContentEl = editModal.querySelector('.auth-modal-content');
                        if (modalContentEl) modalContentEl.scrollTop = 0;
                        if (firstMissingEl) {
                            firstMissingEl.focus({ preventScroll: false });
                            firstMissingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 350);
                }
            }

            // Sync Navbar instantly if it exists
            if (document.getElementById('globalNavAvatar')) document.getElementById('globalNavAvatar').src = photoURL;
            if (document.getElementById('globalNavName')) document.getElementById('globalNavName').innerText = displayName;
        });

        // 3. Fetch Real Stats & Render Order History
        console.log("Profile loaded for UID:", user.uid);
        try {
            const cartSnap = await getDocs(collection(db, `cart/${user.uid}/items`));
            console.log("Cart loaded:", cartSnap.size, "items");
            if (document.getElementById('cartStatCount')) document.getElementById('cartStatCount').innerText = cartSnap.size;

            const favSnap = await getDocs(collection(db, `favorites/${user.uid}/items`));
            console.log("Wishlist loaded:", favSnap.size, "items");
            if (document.getElementById('favStatCount')) document.getElementById('favStatCount').innerText = favSnap.size;

            const ordersSnap = await getDocs(collection(db, 'orders'));
            const userOrders = ordersSnap.docs
                .filter(d => d.data().userId === user.uid || d.data().customerUid === user.uid)
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => {
                    const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                    const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                    return bDate - aDate;
                });
                
            console.log("Orders loaded:", userOrders.length, "orders");
            window.currentUserOrders = userOrders;

            if (document.getElementById('orderStatCount')) document.getElementById('orderStatCount').innerText = userOrders.length;

            const historyList = document.getElementById('ordersHistoryList');
            const emptyUI = document.getElementById('emptyOrdersUI');

            if (historyList && userOrders.length > 0) {
                if (emptyUI) emptyUI.style.display = 'none';

                const statusColors = {
                    'Pending':    { bg: '#fff3cd', color: '#856404' },
                    'Processing': { bg: '#cce5ff', color: '#004085' },
                    'Shipped':    { bg: '#d4edda', color: '#155724' },
                    'Delivered':  { bg: '#d1ecf1', color: '#0c5460' },
                    'Cancelled':  { bg: '#f8d7da', color: '#721c24' }
                };

                userOrders.forEach(order => {
                    const date = order.date?.toDate ? order.date.toDate() : new Date(order.date);
                    const sc = statusColors[order.status] || { bg: '#eee', color: '#333' };
                    const itemsPreview = (order.items || []).slice(0, 3).map(item => `
                        <img src="${item.image}" alt="${item.title}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid #eee;">
                    `).join('');
                    const moreCount = (order.items?.length || 0) > 3 ? `<span style="font-size:0.75rem;color:#888;margin-left:6px;">+${order.items.length - 3} more</span>` : '';

                    const hoursSinceOrder = (Date.now() - date.getTime()) / (1000 * 60 * 60);
                    let cancelBtnHTML = '';
                    if (order.status === 'Pending' || order.status === 'Processing') {
                        if (hoursSinceOrder <= 24) {
                            cancelBtnHTML = `
                                <button id="order-cancel-btn-${order.id}" onclick="window.showCancelOrderModal('${order.id}')" style="margin-top: 12px; background: transparent; border: 1px solid #e74c3c; color: #e74c3c; padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#e74c3c'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='#e74c3c'">
                                    <i class="fas fa-times-circle" style="margin-right: 4px;"></i> Cancel Order
                                </button>
                            `;
                        } else {
                            cancelBtnHTML = `
                                <button disabled style="margin-top: 12px; background: #f9f9f9; border: 1px solid #ddd; color: #999; padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: not-allowed;">
                                    <i class="fas fa-ban" style="margin-right: 4px;"></i> Cancellation period expired
                                </button>
                            `;
                        }
                    }

                    const card = document.createElement('div');
                    card.id = `order-card-${order.id}`;
                    card.innerHTML = `
                        <div style="border:1px solid #eee;border-radius:14px;padding:18px 20px;margin-bottom:14px;background:#fafafa;transition:box-shadow 0.2s;" onmouseenter="this.style.boxShadow='0 4px 18px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <strong style="font-size:0.95rem;">${order.orderId}</strong>
                                    <p style="font-size:0.78rem;color:#888;margin:3px 0 0;">${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div style="display:flex;align-items:center;gap:12px;">
                                    <span id="order-status-${order.id}" style="background:${sc.bg};color:${sc.color};padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;">${order.status}</span>
                                    <strong style="font-size:1rem;">PKR ${(order.total || 0).toLocaleString()}</strong>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:14px;">
                                ${itemsPreview}${moreCount}
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                                <p style="font-size:0.78rem;color:#888;margin-top:10px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${order.client?.fullAddressString || order.client?.city || 'Address on file'}</p>
                                ${cancelBtnHTML}
                            </div>
                        </div>
                    `;
                    historyList.appendChild(card);
                });
            } else if (emptyUI) {
                emptyUI.style.display = '';
            }
        } catch(e) {
            console.error("Stats fetch issue:", e);
        } finally {
            if (window.hideMyMartLoader) {
                window.hideMyMartLoader();
            }
        }
    });

    // Cancel Order Modal Logic
    const injectCancelOrderModal = () => {
        if (document.getElementById('cancelOrderModal')) return;
        const modalHTML = `
            <div id="cancelOrderModal" class="auth-modal-overlay" style="z-index: 10000; backdrop-filter: blur(8px);">
                <div class="auth-modal-content" style="max-width: 400px; text-align: center; border-radius: 16px; padding: 30px 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); animation: cancelModalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <style>
                        @keyframes cancelModalPop {
                            from { opacity: 0; transform: scale(0.95) translateY(10px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        .co-btn {
                            flex: 1; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
                        }
                        .co-btn-left {
                            background: transparent; border: 1px solid #ccc; color: #555;
                        }
                        .co-btn-left:hover {
                            background: #f5f5f5; color: #333;
                        }
                        .co-btn-right {
                            background: #e74c3c; border: 1px solid #e74c3c; color: white;
                        }
                        .co-btn-right:hover {
                            background: #c0392b; border-color: #c0392b;
                        }
                    </style>
                    <div style="font-size: 3rem; color: #e74c3c; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 class="serif" style="margin-bottom: 10px; font-size: 1.5rem; color: #1a1a1a;">Cancel This Order?</h2>
                    <p style="color: #666; margin-bottom: 25px; font-size: 0.9rem; line-height: 1.5;">
                        Are you sure you want to cancel this order? This action cannot be undone after confirmation.
                    </p>
                    
                    <div style="background: #fafafa; border: 1px solid #eee; border-radius: 10px; padding: 15px; margin-bottom: 25px; display: flex; align-items: center; text-align: left; gap: 15px;">
                        <img id="coModalImg" src="" alt="Order Item" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;">
                        <div>
                            <div id="coModalName" style="font-weight: 700; font-size: 0.95rem; color: #333; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;"></div>
                            <div id="coModalId" style="font-size: 0.75rem; color: #888; margin-bottom: 4px;"></div>
                            <div id="coModalPrice" style="font-weight: 700; font-size: 0.9rem; color: #1a1a1a;"></div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 15px;">
                        <button class="co-btn co-btn-left" id="coKeepBtn">Keep Order</button>
                        <button class="co-btn co-btn-right" id="coCancelBtn">Cancel Order</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('coKeepBtn').onclick = () => {
            document.getElementById('cancelOrderModal').classList.remove('active');
        };
    };

    window.showCancelOrderModal = (orderId) => {
        const order = window.currentUserOrders?.find(o => o.id === orderId);
        if (!order) return;

        injectCancelOrderModal();
        const safeTitle = (order.items && order.items[0]) ? order.items[0].title : 'Luxury Item';
        const safeImage = (order.items && order.items[0]) ? order.items[0].image : 'assets/images/default.png';

        document.getElementById('coModalImg').src = safeImage;
        document.getElementById('coModalName').innerText = safeTitle;
        document.getElementById('coModalId').innerText = `ID: ${order.orderId}`;
        document.getElementById('coModalPrice').innerText = `PKR ${(order.total || 0).toLocaleString()}`;
        
        const modal = document.getElementById('cancelOrderModal');
        const keepBtn = document.getElementById('coKeepBtn');
        const cancelBtn = document.getElementById('coCancelBtn');
        
        keepBtn.disabled = false;
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = 'Cancel Order';

        cancelBtn.onclick = () => {
            cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
            cancelBtn.disabled = true;
            keepBtn.disabled = true;
            window.executeOrderCancellation(orderId, modal, cancelBtn, keepBtn);
        };
        
        setTimeout(() => modal.classList.add('active'), 50);
    };

    const showCancelSuccessToast = (msg) => {
        const toastId = 'successCancelToast';
        let toast = document.getElementById(toastId);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = toastId;
            toast.style.cssText = `
                position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px);
                background: #27ae60; color: white; padding: 12px 24px; border-radius: 8px;
                font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 10px;
                box-shadow: 0 10px 30px rgba(39,174,96,0.3); z-index: 10001; opacity: 0;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            `;
            document.body.appendChild(toast);
        }
        toast.innerHTML = \`<i class="fas fa-check-circle"></i> \${msg}\`;
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
        }, 2500);
    };

    // Cancel Order Atomic Transaction
    window.executeOrderCancellation = async (orderId, modal, cancelBtn, keepBtn) => {
        try {
            const { updateDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const orderRef = doc(db, 'orders', orderId);
            const orderSnap = await getDoc(orderRef);
            
            if (!orderSnap.exists()) {
                window.showToast("Order not found.", "error");
                throw new Error("Order not found");
            }
            
            const orderData = orderSnap.data();
            
            // Re-verify eligibility server-side
            const date = orderData.date?.toDate ? orderData.date.toDate() : new Date(orderData.date);
            const hoursSinceOrder = (Date.now() - date.getTime()) / (1000 * 60 * 60);
            if (hoursSinceOrder > 24) {
                window.showToast("Cancellation period (24 hours) has expired.", "error");
                throw new Error("Cancellation expired");
            }
            if (orderData.status !== 'Pending' && orderData.status !== 'Processing') {
                window.showToast("This order can no longer be cancelled.", "error");
                throw new Error("Invalid status");
            }

            const { serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

            // Update order status first using updateDoc
            await updateDoc(orderRef, { 
                status: 'Cancelled',
                cancelledAt: serverTimestamp(),
                cancelledBy: currentAuthUser ? currentAuthUser.uid : 'user',
                cancellationAllowed: false
            });

            // Restore Stock
            if (orderData.items && Array.isArray(orderData.items)) {
                for (const item of orderData.items) {
                    const productRef = doc(db, 'products', item.productId);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        const productData = productSnap.data();
                        const currentStock = productData.stock || 0;
                        const currentSold = productData.sold || 0;
                        const currentSoldCount = productData.soldCount || currentSold || 0;
                        
                        await updateDoc(productRef, {
                            stock: currentStock + item.qty,
                            sold: Math.max(0, currentSold - item.qty),
                            soldCount: Math.max(0, currentSoldCount - item.qty)
                        });
                    }
                }
            }
            
            modal.classList.remove('active');
            showCancelSuccessToast("Order cancelled successfully");

            // UI INSTANT UPDATE
            const statusBadge = document.getElementById(\`order-status-\${orderId}\`);
            if (statusBadge) {
                statusBadge.innerText = 'Cancelled';
                statusBadge.style.background = '#f8d7da';
                statusBadge.style.color = '#721c24';
            }
            const cancelBtnInList = document.getElementById(\`order-cancel-btn-\${orderId}\`);
            if (cancelBtnInList) {
                cancelBtnInList.disabled = true;
                cancelBtnInList.style.cssText = "margin-top: 12px; background: #f9f9f9; border: 1px solid #ddd; color: #999; padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: not-allowed;";
                cancelBtnInList.innerHTML = '<i class="fas fa-ban" style="margin-right: 4px;"></i> Cancelled';
            }
            
        } catch (error) {
            console.error("Cancellation error:", error);
            window.showToast("Unable to cancel order. Please try again.", "error");
            
            // Restore button state
            if (cancelBtn) {
                cancelBtn.innerHTML = 'Cancel Order';
                cancelBtn.disabled = false;
            }
            if (keepBtn) keepBtn.disabled = false;
        }
    };

    // Edit Profile Modal Logic
    const editModal = document.getElementById('editProfileModal');

    const openEditProfileModal = () => {
        if(editModal) editModal.classList.add('active');
    };
    
    const closeEditProfileModal = () => {
        if(editModal) {
            editModal.classList.remove('active');
            // Reset form to DB state when closing
            if (currentUserDoc && currentAuthUser) {
                const displayName = currentUserDoc.name || currentUserDoc.displayName || currentAuthUser.displayName || '';
                const photoURL = currentUserDoc.photoURL || currentAuthUser.photoURL || `https://ui-avatars.com/api/?name=${currentAuthUser.email}`;
                document.getElementById('editFullName').value = displayName;
                
                if (document.getElementById('editPhone')) document.getElementById('editPhone').value = currentUserDoc.phone || '';
                if (document.getElementById('editCountry')) document.getElementById('editCountry').value = currentUserDoc.country || '';
                if (document.getElementById('editCity')) document.getElementById('editCity').value = currentUserDoc.city || '';
                if (document.getElementById('editProvince')) document.getElementById('editProvince').value = currentUserDoc.province || '';
                if (document.getElementById('editPostalCode')) document.getElementById('editPostalCode').value = currentUserDoc.postalCode || '';
                if (document.getElementById('editStreetAddress')) document.getElementById('editStreetAddress').value = currentUserDoc.streetAddress || '';
                if (document.getElementById('editHouseNumber')) document.getElementById('editHouseNumber').value = currentUserDoc.houseNumber || '';
                if (document.getElementById('editFlatNumber')) document.getElementById('editFlatNumber').value = currentUserDoc.flatNumber || '';
                if (document.getElementById('editNotes')) document.getElementById('editNotes').value = currentUserDoc.notes || '';
                
                document.getElementById('editModalImagePreview').src = photoURL;
                
                const fileInput = document.getElementById('profileImageInput');
                if (fileInput) fileInput.value = '';
                
                selectedImageFile = null;
            }
        }
    };
    
    // Robust event binding function
    const bindModalEvents = () => {
        const openBtn1 = document.getElementById('editProfileSidebarBtn');
        const openBtn2 = document.getElementById('editAvatarBtn');
        const closeBtn = document.getElementById('closeEditProfileBtn');
        const cancelBtn = document.getElementById('cancelEditProfileBtn');

        if(openBtn1) openBtn1.addEventListener('click', (e) => { e.preventDefault(); openEditProfileModal(); });
        if(openBtn2) openBtn2.addEventListener('click', (e) => { e.preventDefault(); openEditProfileModal(); });
        if(closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeEditProfileModal(); });
        if(cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeEditProfileModal(); });

        // Close on outside click
        if(editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) closeEditProfileModal();
            });
        }
    };
    
    bindModalEvents();

    // Handle Image Preview
    const imageInput = document.getElementById('profileImageInput');
    const previewImage = document.getElementById('editModalImagePreview');
    let selectedImageFile = null;

    // Fallback click handler on overlay to guarantee file input triggers
    const uploadLabel = document.querySelector('.upload-circle');
    if (uploadLabel) {
        uploadLabel.addEventListener('click', (e) => {
            // Only trigger if click wasn't already on the input to avoid double firing
            if (e.target !== imageInput) {
                imageInput.click();
            }
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedImageFile = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (previewImage) previewImage.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Cloudinary Upload Helper
    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'E-commerce/profiles');

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Cloudinary upload failed');
        const data = await response.json();
        return data.secure_url;
    };

    // Handle Form Submit
    const editForm = document.getElementById('editProfileForm');
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = editForm.querySelector('button[type="submit"]');
        const newName = document.getElementById('editFullName').value.trim();
        
        if (!newName) return window.showToast('Name cannot be empty', 'error');

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            let updatedPhotoURL = currentUserDoc.photoURL || currentAuthUser.photoURL;

            // 1. Upload new image if selected
            if (selectedImageFile) {
                updatedPhotoURL = await uploadToCloudinary(selectedImageFile);
            }

            // 2. Update Firebase Auth Profile
            await updateProfile(currentAuthUser, {
                displayName: newName,
                photoURL: updatedPhotoURL
            });

            // 3. Update Firestore Document (strict requested structure)
            const phone = document.getElementById('editPhone').value.trim();
            const country = document.getElementById('editCountry').value.trim();
            const city = document.getElementById('editCity').value.trim();
            const province = document.getElementById('editProvince').value.trim();
            const streetAddress = document.getElementById('editStreetAddress').value.trim();
            const houseNumber = document.getElementById('editHouseNumber').value.trim();
            const flatNumber = document.getElementById('editFlatNumber').value.trim();
            const postalCode = document.getElementById('editPostalCode').value.trim();
            const notes = document.getElementById('editNotes').value.trim();

            const profileCompleted = !!(phone && country && city && streetAddress && houseNumber);

            const userRef = doc(db, 'users', currentAuthUser.uid);
            await setDoc(userRef, {
                name: newName,
                displayName: newName, // Keeping displayName for backwards compatibility
                email: currentAuthUser.email,
                photoURL: updatedPhotoURL,
                phone,
                country,
                city,
                province,
                streetAddress,
                houseNumber,
                flatNumber,
                postalCode,
                notes,
                profileCompleted
            }, { merge: true });

            // 4. Update UI instantly (onSnapshot handles this now, but we close modal and show toast)
            window.showToast('Profile updated successfully!');
            
            // Auto-redirect back to cart if they were forced here by checkout guard
            if (sessionStorage.getItem('mymart_return_to_cart') === 'true' && profileCompleted) {
                sessionStorage.removeItem('mymart_return_to_cart');
                setTimeout(() => {
                    window.location.href = 'cart.html';
                }, 800);
            } else {
                closeEditProfileModal();
            }

        } catch (error) {
            console.error("Error updating profile:", error);
            window.showToast('Failed to update profile.', 'error');
        } finally {
            submitBtn.innerHTML = 'Save Changes';
            submitBtn.disabled = false;
        }
    });

    // Logout via main navbar modal (override profile specific button to use global modal)
    const logoutBtn = document.getElementById('profileLogoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.stopPropagation();
            if(window.showLogoutModal) {
                window.showLogoutModal();
            } else {
                auth.signOut().then(() => window.location.href = 'index.html');
            }
        };
    }
});
