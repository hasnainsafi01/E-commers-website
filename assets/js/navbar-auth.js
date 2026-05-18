import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Inject a hidden placeholder immediately to prevent layout shift
    const navActions = document.querySelector('.nav-actions');
    if (navActions && !document.getElementById('navbarAuth')) {
        const placeholder = document.createElement('div');
        placeholder.id = 'navbarAuth';
        placeholder.className = 'nav-auth-group';
        placeholder.style.opacity = '0';
        placeholder.style.transition = 'opacity 0.25s ease';
        navActions.prepend(placeholder);
    }

    onAuthStateChanged(auth, async (user) => {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        let authContainer = document.getElementById('navbarAuth');
        if (!authContainer) {
            authContainer = document.createElement('div');
            authContainer.id = 'navbarAuth';
            authContainer.className = 'nav-auth-group';
            authContainer.style.opacity = '0';
            authContainer.style.transition = 'opacity 0.25s ease';
            navActions.prepend(authContainer);
        }

        // If admin just logged out, force guest UI — do not show profile state
        if (sessionStorage.getItem('chenari_admin_just_logged_out') === 'true') {
            authContainer.innerHTML = `
                <a href="login.html" class="nav-login-btn">Login</a>
                <a href="signup.html" class="nav-signup-btn">Sign Up</a>
            `;
            requestAnimationFrame(() => { authContainer.style.opacity = '1'; });
            return;
        }

        if (user) {
            // Render initial standard layout immediately
            const initialPhotoURL = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;
            const initialName = user.displayName || 'User';

            authContainer.innerHTML = `
                <div class="user-profile-nav">
                    <img src="${initialPhotoURL}" alt="Profile" class="nav-avatar" id="globalNavAvatar">
                    <div class="user-dropdown">
                        <div class="dropdown-header">
                            <img src="${initialPhotoURL}" alt="Profile" class="dropdown-avatar" id="globalDropdownAvatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; display: block; border: 2px solid var(--nav-border);">
                            <strong id="globalNavName">${initialName}</strong>
                            <span>${user.email}</span>
                        </div>
                        <a href="profile.html"><i class="far fa-user"></i> My Profile</a>
                        <a href="orders.html"><i class="fas fa-box"></i> Orders</a>
                        <a href="favorites.html"><i class="far fa-heart"></i> Favorites</a>
                        <a href="profile.html"><i class="fas fa-cog"></i> Settings</a>
                        <button id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>
                    </div>
                </div>
            `;

            // Real-Time onSnapshot Sync for Navbar
            const userRef = doc(db, 'users', user.uid);
            onSnapshot(userRef, (userSnap) => {
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const photoURL = userData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;
                    const userName = userData.name || userData.displayName || user.displayName || 'User';

                    const navAvatar = document.getElementById('globalNavAvatar');
                    const dropAvatar = document.getElementById('globalDropdownAvatar');
                    const navName = document.getElementById('globalNavName');

                    if (navAvatar) navAvatar.src = photoURL;
                    if (dropAvatar) dropAvatar.src = photoURL;
                    if (navName) navName.innerText = userName;
                }
            }, (error) => {
                console.error("Navbar sync error:", error);
            });

            // Dropdown Toggle Logic
            const profileNav = authContainer.querySelector('.user-profile-nav');
            const dropdown = authContainer.querySelector('.user-dropdown');
            
            profileNav.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            };

            document.addEventListener('click', () => dropdown.classList.remove('active'));

            // Logout Modal Logic
            authContainer.querySelector('#logoutBtn').onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.remove('active');
                showLogoutModal();
            };

        } else {
            authContainer.innerHTML = `
                <a href="login.html" class="nav-login-btn">Login</a>
                <a href="signup.html" class="nav-signup-btn">Sign Up</a>
            `;
        }

        // Fade in auth container after content is ready
        requestAnimationFrame(() => { authContainer.style.opacity = '1'; });
    });

    // Global Logout Modal Implementation
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
                        <p>Are you sure you want to logout from your premium CHENARI account?</p>
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
        
        setTimeout(() => modal.classList.add('active'), 10);

        const closeModal = () => modal.classList.remove('active');

        document.getElementById('cancelLogoutBtn').onclick = closeModal;
        modal.onclick = (e) => { if(e.target === modal) closeModal(); };

        document.getElementById('confirmLogoutBtn').onclick = async () => {
            const btn = document.getElementById('confirmLogoutBtn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            await signOut(auth);
            window.location.href = 'index.html';
        };
    };
    
    // Make global for profile page
    window.showLogoutModal = showLogoutModal;
});
