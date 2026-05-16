import { auth, googleProvider } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    sendPasswordResetEmail,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const googleBtn = document.getElementById('googleBtn');
    const forgotLink = document.getElementById('forgotPass');

    // 1. Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                submitBtn.innerText = 'Signing in...';
                submitBtn.disabled = true;
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Login Error:", error.code);
                showAuthError(error.code);
            } finally {
                submitBtn.innerText = 'Login';
                submitBtn.disabled = false;
            }
        });
    }

    // 1b. Registration Logic
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = signupForm.fullname.value;
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const confirmPass = signupForm.confirmPassword.value;
            const submitBtn = signupForm.querySelector('button[type="submit"]');

            if (password !== confirmPass) {
                alert("Passwords do not match!");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            try {
                submitBtn.innerText = 'Creating Account...';
                submitBtn.disabled = true;
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Set Display Name
                await updateProfile(user, { displayName: name });
                
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Signup Error:", error.code);
                showAuthError(error.code);
            } finally {
                submitBtn.innerText = 'Create Account';
                submitBtn.disabled = false;
            }
        });
    }

    // 2. Google Login
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, googleProvider);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Google Login Error:", error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showAuthError(error.code);
                }
            }
        });
    }

    // 3. Forgot Password
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt("Please enter your registered email address:");
            if (email) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    alert("Password reset email sent! Please check your inbox.");
                } catch (error) {
                    showAuthError(error.code);
                }
            }
        });
    }

    // 4. Password Visibility Toggle
    const toggleBtns = document.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            btn.classList.toggle('fa-eye');
            btn.classList.toggle('fa-eye-slash');
        });
    });

    // Error Handling Helper
    function showAuthError(code) {
        let message = "An error occurred during authentication.";
        switch (code) {
            case 'auth/invalid-email': message = "Invalid email address format."; break;
            case 'auth/user-not-found': message = "No user found with this email."; break;
            case 'auth/wrong-password': message = "Incorrect password."; break;
            case 'auth/invalid-credential': message = "Invalid login credentials."; break;
            case 'auth/too-many-requests': message = "Too many attempts. Please try again later."; break;
            case 'auth/email-already-in-use': message = "This email is already registered."; break;
            case 'auth/weak-password': message = "The password is too weak."; break;
        }
        alert(message); 
    }
});
