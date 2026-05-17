import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

        // 1. Fetch Real User Data
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        currentUserDoc = userSnap.exists() ? userSnap.data() : {};

        const displayName = currentUserDoc.displayName || user.displayName || 'Luxury Connoisseur';
        const photoURL = currentUserDoc.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;

        // 2. Update Basic Info
        document.getElementById('userProfileName').innerText = displayName;
        document.getElementById('userProfileEmail').innerText = user.email;
        document.getElementById('userProfileImage').src = photoURL;
        
        // Populate edit modal
        document.getElementById('editFullName').value = displayName;
        document.getElementById('editModalImagePreview').src = photoURL;

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
    const openBtn1 = document.getElementById('editProfileSidebarBtn');
    const openBtn2 = document.getElementById('editAvatarBtn');
    const closeBtn = document.getElementById('closeEditProfileBtn');

    const openEditProfileModal = () => {
        if(editModal) editModal.classList.add('active');
    };
    
    const closeEditProfileModal = () => {
        if(editModal) editModal.classList.remove('active');
    };

    if(openBtn1) openBtn1.addEventListener('click', openEditProfileModal);
    if(openBtn2) openBtn2.addEventListener('click', openEditProfileModal);
    if(closeBtn) closeBtn.addEventListener('click', closeEditProfileModal);

    // Close on outside click
    if(editModal) {
        editModal.onclick = (e) => {
            if (e.target === editModal) closeEditProfileModal();
        };
    }

    // Handle Image Preview
    const imageInput = document.getElementById('profileImageInput');
    const previewImage = document.getElementById('editModalImagePreview');
    let selectedImageFile = null;

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

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

            // 3. Update Firestore Document
            const userRef = doc(db, 'users', currentAuthUser.uid);
            await setDoc(userRef, {
                displayName: newName,
                photoURL: updatedPhotoURL
            }, { merge: true });

            // 4. Update UI instantly
            document.getElementById('userProfileName').innerText = newName;
            document.getElementById('userProfileImage').src = updatedPhotoURL;
            if (document.getElementById('globalNavAvatar')) {
                document.getElementById('globalNavAvatar').src = updatedPhotoURL;
            }
            if (document.getElementById('globalNavName')) {
                document.getElementById('globalNavName').innerText = newName;
            }

            window.showToast('Profile updated successfully!');
            closeEditProfileModal();

        } catch (error) {
            console.error("Error updating profile:", error);
            window.showToast('Failed to update profile.', 'error');
        } finally {
            submitBtn.innerText = 'Save Changes';
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
