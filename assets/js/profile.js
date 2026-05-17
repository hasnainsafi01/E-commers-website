import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CLOUD_NAME = "dqsvcn94y";
const UPLOAD_PRESET = "ml_default";
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
            
            // Populate edit modal (only if modal is not currently active to prevent typing interruptions)
            const editModal = document.getElementById('editProfileModal');
            if (editModal && !editModal.classList.contains('active')) {
                document.getElementById('editFullName').value = displayName;
                document.getElementById('editEmail').value = user.email;
                document.getElementById('editModalImagePreview').src = photoURL;
            }

            // Sync Navbar instantly if it exists
            if (document.getElementById('globalNavAvatar')) document.getElementById('globalNavAvatar').src = photoURL;
            if (document.getElementById('globalNavName')) document.getElementById('globalNavName').innerText = displayName;
        });

        // 3. Fetch Real Stats
        try {
            const cartSnap = await getDocs(collection(db, `users/${user.uid}/cart`));
            document.getElementById('cartStatCount').innerText = cartSnap.size;

            const favSnap = await getDocs(collection(db, `users/${user.uid}/favorites`));
            document.getElementById('favStatCount').innerText = favSnap.size;

            const ordersSnap = await getDocs(collection(db, 'orders'));
            const userOrders = ordersSnap.docs.filter(doc => doc.data().customerUid === user.uid);
            document.querySelector('.profile-stats .stat-value').innerText = userOrders.length;
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
            const userRef = doc(db, 'users', currentAuthUser.uid);
            await setDoc(userRef, {
                name: newName,
                displayName: newName, // Keeping displayName for backwards compatibility
                email: currentAuthUser.email,
                photoURL: updatedPhotoURL
            }, { merge: true });

            // 4. Update UI instantly (onSnapshot handles this now, but we close modal and show toast)
            window.showToast('Profile updated successfully!');
            closeEditProfileModal();

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
