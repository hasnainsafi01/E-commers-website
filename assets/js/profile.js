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

        // 1. Real-Time User Data Sync
        const userRef = doc(db, 'users', user.uid);
        
        onSnapshot(userRef, (userSnap) => {
            currentUserDoc = userSnap.exists() ? userSnap.data() : {};
            
            // Prefer strictly requested 'name', fallback to displayName
            const displayName = currentUserDoc.name || currentUserDoc.displayName || user.displayName || 'Luxury Connoisseur';
            const photoURL = currentUserDoc.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;

            // 2. Update Basic Info Real-Time
            if (document.getElementById('userProfileName')) document.getElementById('userProfileName').innerText = displayName;
            if (document.getElementById('userProfileEmail')) document.getElementById('userProfileEmail').innerText = user.email;
            if (document.getElementById('userProfileImage')) document.getElementById('userProfileImage').src = photoURL;
            
            // Check Profile Completion logic
            const requiredFields = ['phone', 'country', 'city', 'streetAddress', 'houseNumber'];
            let filledCount = 0;
            requiredFields.forEach(field => {
                if (currentUserDoc[field] && currentUserDoc[field].trim() !== '') filledCount++;
            });
            const completionPercentage = Math.round((filledCount / requiredFields.length) * 100);
            
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
            }

            // Sync Navbar instantly if it exists
            if (document.getElementById('globalNavAvatar')) document.getElementById('globalNavAvatar').src = photoURL;
            if (document.getElementById('globalNavName')) document.getElementById('globalNavName').innerText = displayName;
        });

        // 3. Fetch Real Stats & Render Order History
        try {
            const cartSnap = await getDocs(collection(db, `cart/${user.uid}/items`));
            if (document.getElementById('cartStatCount')) document.getElementById('cartStatCount').innerText = cartSnap.size;

            const favSnap = await getDocs(collection(db, `favorites/${user.uid}/items`));
            if (document.getElementById('favStatCount')) document.getElementById('favStatCount').innerText = favSnap.size;

            const ordersSnap = await getDocs(collection(db, 'orders'));
            const userOrders = ordersSnap.docs
                .filter(d => d.data().customerUid === user.uid)
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => {
                    const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                    const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                    return bDate - aDate;
                });

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

                    const card = document.createElement('div');
                    card.innerHTML = `
                        <div style="border:1px solid #eee;border-radius:14px;padding:18px 20px;margin-bottom:14px;background:#fafafa;transition:box-shadow 0.2s;" onmouseenter="this.style.boxShadow='0 4px 18px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <strong style="font-size:0.95rem;">${order.orderId}</strong>
                                    <p style="font-size:0.78rem;color:#888;margin:3px 0 0;">${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div style="display:flex;align-items:center;gap:12px;">
                                    <span style="background:${sc.bg};color:${sc.color};padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;">${order.status}</span>
                                    <strong style="font-size:1rem;">$${(order.total || 0).toLocaleString()}</strong>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;margin-top:14px;">
                                ${itemsPreview}${moreCount}
                            </div>
                            <p style="font-size:0.78rem;color:#888;margin-top:10px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${order.client?.fullAddressString || order.client?.city || 'Address on file'}</p>
                        </div>
                    `;
                    historyList.appendChild(card);
                });
            } else if (emptyUI) {
                emptyUI.style.display = '';
            }
        } catch(e) {
            console.log("Stats fetch issue:", e);
        }
    });

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
            if (sessionStorage.getItem('chenari_return_to_cart') === 'true' && profileCompleted) {
                sessionStorage.removeItem('chenari_return_to_cart');
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
