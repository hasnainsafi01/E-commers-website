import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const userImage = document.getElementById('userProfileImage');
    const userName = document.getElementById('userProfileName');
    const userEmail = document.getElementById('userProfileEmail');
    const cartStat = document.getElementById('cartStatCount');
    const favStat = document.getElementById('favStatCount');
    const logoutBtn = document.getElementById('profileLogoutBtn');

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return;
        }

        // Populate User Info
        const photoURL = user.photoURL || 'https://ui-avatars.com/api/?name=' + (user.displayName || user.email);
        userImage.src = photoURL;
        userName.innerText = user.displayName || 'Guest User';
        userEmail.innerText = user.email;

        // Calculate Stats from LocalStorage
        const cart = JSON.parse(localStorage.getItem('chenari_cart')) || [];
        const favorites = JSON.parse(localStorage.getItem('chenari_favorites')) || [];

        cartStat.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
        favStat.innerText = favorites.length;
    });

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }
});
