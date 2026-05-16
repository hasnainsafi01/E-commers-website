import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    // Check if we already have a profile btn or login btn
    let authContainer = document.getElementById('navbarAuth');
    if (!authContainer) {
        authContainer = document.createElement('div');
        authContainer.id = 'navbarAuth';
        authContainer.style.display = 'flex';
        authContainer.style.alignItems = 'center';
        // Insert before the theme toggle or at the start of nav-actions
        navActions.prepend(authContainer);
    }

    if (user) {
        // User is signed in
        const photoURL = user.photoURL || 'https://ui-avatars.com/api/?name=' + (user.displayName || user.email);
        authContainer.innerHTML = `
            <div class="user-profile-nav" style="position: relative; cursor: pointer; margin-right: 15px;">
                <img src="${photoURL}" alt="Profile" style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid var(--primary-blue);">
                <div class="user-dropdown" style="display: none; position: absolute; top: 45px; right: 0; background: var(--bg-color); box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 12px; padding: 10px; min-width: 150px; z-index: 100;">
                    <button id="logoutBtn" style="width: 100%; padding: 10px; background: none; border: none; text-align: left; cursor: pointer; color: var(--primary-red); font-weight: 600;">Logout</button>
                </div>
            </div>
        `;

        // Toggle dropdown
        const profile = authContainer.querySelector('.user-profile-nav');
        const dropdown = authContainer.querySelector('.user-dropdown');
        profile.addEventListener('click', () => {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Logout logic
        authContainer.querySelector('#logoutBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await signOut(auth);
            window.location.reload();
        });

    } else {
        // User is signed out
        authContainer.innerHTML = `
            <a href="login.html" class="login-nav-btn" style="margin-right: 15px; font-weight: 600; color: var(--text-color); text-decoration: none;">Login</a>
        `;
    }
});
