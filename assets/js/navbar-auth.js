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
                    <img src="${photoURL}" alt="Profile" class="nav-avatar">
                    <div class="user-dropdown">
                        <div class="dropdown-header">
                            <strong>${userName}</strong>
                            <span>${user.email}</span>
                        </div>
                        <a href="profile.html"><i class="far fa-user"></i> My Profile</a>
                        <a href="orders.html"><i class="fas fa-shopping-bag"></i> My Orders</a>
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

            // Logout Logic
            authContainer.querySelector('#logoutBtn').onclick = async () => {
                await signOut(auth);
                window.location.href = 'index.html';
            };

        } else {
            authContainer.innerHTML = `
                <a href="login.html" class="nav-login-btn">Login</a>
                <a href="signup.html" class="nav-signup-btn">Sign Up</a>
            `;
        }
    });
});
