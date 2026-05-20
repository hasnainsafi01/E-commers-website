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

        let isSuccess = false;

        try {
            // 1. Prevent Auth Conflict: Log out any active sessions before starting new admin login
            if (auth.currentUser) {
                await signOut(auth);
            }

            // Clear any old session storage before attempting login
            sessionStorage.removeItem('mymart_admin_session');

            // 2. Perform Firebase Authentication login
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const user = credential.user;
            const uid = user.uid;

            console.log("Firebase login success");
            console.log("UID:", uid);

            // 3. Fetch User Document from Firestore to verify role-based permissions
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await signOut(auth);
                showError("Access denied. Admin privileges required.");
                return;
            }

            console.log("Firestore document found");
            const userData = userSnap.data();
            const role = userData.role;
            console.log("Role:", role);

            // 4. Role validation
            if (role === 'admin') {
                isSuccess = true;
                // Success! Set session indicator and redirect
                sessionStorage.setItem('mymart_admin_session', 'true');
                
                // Expose success toast
                if (window.showToast) {
                    window.showToast("Portal unlocked. Welcome, Admin.");
                }

                console.log("Navigating to dashboard");
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
            console.error("Admin Authentication Failure:", err);
            let msg = "Invalid email or password";
            if (err.code === 'auth/too-many-requests') {
                msg = "Security hold: Too many attempts. Please try again later.";
            } else if (err.code && err.code.startsWith('auth/')) {
                msg = "Invalid email or password";
            } else {
                msg = "Unable to verify admin account.";
            }
            showError(msg);
        } finally {
            // Only restore credentials button state if login was not successful
            if (!isSuccess) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Verify Credentials';
            }
        }
    };

    function showError(message) {
        errorBox.innerText = message;
        errorBox.style.display = 'block';
    }
});
