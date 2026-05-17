import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        let authContainer = document.getElementById('navbarAuth');
        if (!authContainer) {
            authContainer = document.createElement('div');
            authContainer.id = 'navbarAuth';
            authContainer.className = 'nav-auth-group';
            navActions.prepend(authContainer);
        }

        if (user) {
            // Fetch real profile data from Firestore (optional but more robust)
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : null;
            
            const photoURL = userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;
            const userName = userData?.displayName || user.displayName || 'User';

            authContainer.innerHTML = `
                <div class="user-profile-nav">
                    <img src="${photoURL}" alt="Profile" class="nav-avatar" id="globalNavAvatar">
                    <div class="user-dropdown">
                        <div class="dropdown-header">
                            <strong id="globalNavName">${userName}</strong>
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
