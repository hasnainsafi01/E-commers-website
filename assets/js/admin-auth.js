import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const submitBtn = document.getElementById('adminSubmitBtn');
    const errorBox = document.getElementById('adminErrorBox');

    if (!loginForm) return;

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Reset display
        errorBox.style.display = 'none';
        errorBox.innerText = '';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        try {
            // 1. Prevent Auth Conflict: Log out any active sessions before starting new admin login
            if (auth.currentUser) {
                await signOut(auth);
            }

            // Clear any old session storage before attempting login
            sessionStorage.removeItem('mymart_admin_session');

            let user;
            try {
                // 2. Perform Firebase Authentication login
                const credential = await signInWithEmailAndPassword(auth, email, password);
                user = credential.user;
            } catch (authErr) {
                console.error("Admin Auth Credentials Failure:", authErr);
                let msg = "Invalid email or password";
                if (authErr.code === 'auth/too-many-requests') {
                    msg = "Security hold: Too many attempts. Please try again later.";
                }
                showError(msg);
                return;
            }

            let userSnap;
            try {
                // 3. Fetch User Document from Firestore to verify role-based permissions
                const userRef = doc(db, 'users', user.uid);
                userSnap = await getDoc(userRef);
            } catch (firestoreErr) {
                console.error("Admin Auth Firestore Failure:", firestoreErr);
                await signOut(auth);
                showError("Unable to verify admin account.");
                return;
            }

            if (!userSnap.exists()) {
                // User document doesn't exist in Firestore, sign out and error
                await signOut(auth);
                showError("Unable to verify admin account.");
                return;
            }

            const userData = userSnap.data();

            // 4. Role validation
            if (userData.role === 'admin') {
                // Success! Set session indicator and redirect
                sessionStorage.setItem('mymart_admin_session', 'true');
                
                // Expose success toast
                if (window.showToast) {
                    window.showToast("Portal unlocked. Welcome, Admin.");
                }

                submitBtn.innerHTML = '<i class="fas fa-check"></i> Redirecting...';
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 800);
            } else {
                // Not an admin! Log out immediately and display error
                await signOut(auth);
                showError("Access denied. Admin privileges required.");
            }

        } catch (err) {
            console.error("Unexpected Admin Authentication Failure:", err);
            showError("Unable to verify admin account.");
        }
    };

    function showError(message) {
        errorBox.innerText = message;
        errorBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Verify Credentials';
    }
});
