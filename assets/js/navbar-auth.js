import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // Ensure navbarAuth container exists synchronously
    let authContainer = document.getElementById('navbarAuth');
    if (!authContainer) {
        authContainer = document.createElement('div');
        authContainer.id = 'navbarAuth';
        authContainer.className = 'nav-auth-group';
        authContainer.style.transition = 'opacity 0.25s ease';
        navActions.prepend(authContainer);
    }

    // Helper to render user profile UI
    const renderProfileUI = (userData) => {
        const photoURL = userData.photoURL || `https://ui-avatars.com/api/?name=${userData.email}`;
        const name = userData.displayName || 'User';

        authContainer.innerHTML = `
            <div class="user-profile-nav">
                <img src="${photoURL}" alt="Profile" class="nav-avatar" id="globalNavAvatar">
                <div class="user-dropdown">
                    <div class="dropdown-header">
                        <img src="${photoURL}" alt="Profile" class="dropdown-avatar" id="globalDropdownAvatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; display: block; border: 2px solid var(--nav-border);">
                        <strong id="globalNavName">${name}</strong>
                        <span>${userData.email}</span>
                    </div>
                    <a href="profile.html"><i class="far fa-user"></i> My Profile</a>
                    <a href="orders.html"><i class="fas fa-box"></i> Orders</a>
                    <a href="favorites.html"><i class="far fa-heart"></i> Favorites</a>
                    <a href="profile.html"><i class="fas fa-cog"></i> Settings</a>
                    <button id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </div>
        `;

        // Bind interactive events
        const profileNav = authContainer.querySelector('.user-profile-nav');
        const dropdown = authContainer.querySelector('.user-dropdown');
        
        if (profileNav && dropdown) {
            profileNav.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            };
        }

        // Logout listener
        const logoutBtn = authContainer.querySelector('#logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.stopPropagation();
                if (dropdown) dropdown.classList.remove('active');
                showLogoutModal();
            };
        }

        authContainer.style.opacity = '1';
    };

    // Helper to render guest login/signup buttons
    const renderGuestUI = () => {
        authContainer.innerHTML = `
            <a href="login.html" class="nav-login-btn">Login</a>
            <a href="signup.html" class="nav-signup-btn">Sign Up</a>
        `;
        authContainer.style.opacity = '1';
    };

    // Global Click to dismiss dropdown
    document.addEventListener('click', () => {
        const dropdown = authContainer.querySelector('.user-dropdown');
        if (dropdown) dropdown.classList.remove('active');
    });

    // STEP 1: Synchronous Initial Render from LocalStorage Cache to completely eliminate flickering
    const cachedUserString = localStorage.getItem('mymart_logged_in_user');
    const isLogoutFlagActive = sessionStorage.getItem('mymart_admin_just_logged_out') === 'true';

    if (cachedUserString && !isLogoutFlagActive) {
        try {
            const cachedUser = JSON.parse(cachedUserString);
            renderProfileUI(cachedUser);
        } catch (e) {
            console.warn("Parsing cached auth session failed:", e);
            renderGuestUI();
        }
    } else {
        renderGuestUI();
    }

    // STEP 2: Asynchronous Real-Time updates from Firebase Auth State
    let unsubscribeFirestore = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // A user successfully authenticated! Clear the admin logout conflict flags
            sessionStorage.removeItem('mymart_admin_just_logged_out');
            sessionStorage.removeItem('mymart_logged_in_admin');

            // Failsafe role check to ensure admin doesn't get treated as customer
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    // Admin must never have a customer session or UI
                    localStorage.removeItem('mymart_logged_in_user');
                    if (unsubscribeFirestore) {
                        unsubscribeFirestore();
                        unsubscribeFirestore = null;
                    }
                    renderGuestUI();
                    
                    // Redirect directly to admin dashboard
                    window.location.href = 'admin.html';
                    return;
                }
            } catch (err) {
                console.error("Firestore role lookup failure in navbar:", err);
            }
        }

        // If admin just logged out, force guest UI immediately
        if (sessionStorage.getItem('mymart_admin_just_logged_out') === 'true') {
            localStorage.removeItem('mymart_logged_in_user');
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
                unsubscribeFirestore = null;
            }
            renderGuestUI();
            return;
        }

        // Mobile drawer live sync
        if (window.updateDrawerAuthUI) {
            window.updateDrawerAuthUI(user);
        }

        if (user) {
            const defaultPhoto = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;
            const defaultName = user.displayName || 'User';

            const activeUserSession = {
                uid: user.uid,
                email: user.email,
                displayName: defaultName,
                photoURL: defaultPhoto
            };

            // Safely write to cache
            localStorage.setItem('mymart_logged_in_user', JSON.stringify(activeUserSession));

            // Render right away
            renderProfileUI(activeUserSession);

            // Cancel any old firestore snapshot listener
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }

            // Listen for Firestore profile updates to keep navbar updated reactively
            const userRef = doc(db, 'users', user.uid);
            unsubscribeFirestore = onSnapshot(userRef, (userSnap) => {
                if (userSnap.exists()) {
                    const snapData = userSnap.data();
                    const updatedName = snapData.name || snapData.displayName || user.displayName || 'User';
                    const updatedPhoto = snapData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;

                    const updatedUserSession = {
                        uid: user.uid,
                        email: user.email,
                        displayName: updatedName,
                        photoURL: updatedPhoto
                    };

                    // Persist updated values in cache
                    localStorage.setItem('mymart_logged_in_user', JSON.stringify(updatedUserSession));

                    // Update live visual nodes smoothly without recreating HTML
                    const navAvatar = document.getElementById('globalNavAvatar');
                    const dropAvatar = document.getElementById('globalDropdownAvatar');
                    const navName = document.getElementById('globalNavName');

                    if (navAvatar) navAvatar.src = updatedPhoto;
                    if (dropAvatar) dropAvatar.src = updatedPhoto;
                    if (navName) navName.innerText = updatedName;
                }
            }, (error) => {
                console.error("Navbar profile synchronizer snapped:", error);
            });

        } else {
            // Clean up session state
            localStorage.removeItem('mymart_logged_in_user');
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
                unsubscribeFirestore = null;
            }
            renderGuestUI();
        }
    });

    // Global Logout Confirmation Modal Implementation
    const showLogoutModal = () => {
        if (document.getElementById('logoutModal')) {
            document.getElementById('logoutModal').classList.add('active');
            return;
        }

        const modalHTML = `
            <div id="logoutModal" class="auth-modal-overlay">
                <div class="auth-modal-content">
                    <div class="auth-modal-header" style="margin-bottom: 20px;">
                        <i class="fas fa-sign-out-alt" style="font-size: 3rem; color: var(--primary-blue); margin-bottom: 20px; opacity: 0.8;"></i>
                        <h2 class="serif">Confirm Logout</h2>
                        <p>Are you sure you want to logout from your premium MyMart account?</p>
                    </div>
                    <div class="auth-modal-options" style="flex-direction: row; justify-content: center; gap: 15px;">
                        <button id="confirmLogoutBtn" class="btn-primary" style="background: var(--primary-red); border: none; padding: 12px 30px;">Logout</button>
                        <button id="cancelLogoutBtn" class="btn-secondary" style="padding: 12px 30px;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('logoutModal');
        setTimeout(() => { if (modal) modal.classList.add('active'); }, 10);

        const closeModal = () => { if (modal) modal.classList.remove('active'); };

        const cancelBtn = document.getElementById('cancelLogoutBtn');
        if (cancelBtn) cancelBtn.onclick = closeModal;

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };
        }

        const confirmBtn = document.getElementById('confirmLogoutBtn');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                confirmBtn.disabled = true;
                
                // Show auth-grade loader during logout
                if (window.showMyMartLoader) window.showMyMartLoader('Signing out...');

                // Clear active user session
                localStorage.removeItem('mymart_logged_in_user');
                
                try {
                    await signOut(auth);
                } catch (e) {
                    console.error("Sign out error:", e);
                    if (window.hideMyMartLoader) window.hideMyMartLoader();
                }
                
                closeModal();
                window.location.href = 'index.html';
            };
        }
    };

    // Expose globally
    window.showLogoutModal = showLogoutModal;
});
