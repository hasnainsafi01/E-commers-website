import { auth, googleProvider, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup, 
    sendPasswordResetEmail,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper: Save/Update User in Firestore
const syncUserToFirestore = async (user) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // New user profile
        await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || 'Luxury Connoisseur', // Added name
            displayName: user.displayName || 'Luxury Connoisseur',
            email: user.email,
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`,
            role: 'user', // default role
            welcomeShown: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            bio: 'Welcome to your premium CHENARI profile.'
        });
    } else {
        // Update last login
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
};

// Global Utility for Toast
window.showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.style.background = type === 'error' ? 'var(--primary-red)' : '#111';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleBtn = document.getElementById('googleBtn');
    const forgotBtn = document.getElementById('forgotPass');

    // 1. Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            if (!email || !password) {
                return window.showToast('Please fill in all fields.', 'error');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return window.showToast('Please enter a valid email address.', 'error');
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
                submitBtn.disabled = true;
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await syncUserToFirestore(userCredential.user);
                
                // Fetch role and redirect dynamically
                const userRef = doc(db, 'users', userCredential.user.uid);
                const userSnap = await getDoc(userRef);
                const role = userSnap.exists() ? userSnap.data().role : 'user';
                
                if (role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                showAuthError(error.code);
            } finally {
                submitBtn.innerText = 'Login';
                submitBtn.disabled = false;
            }
        });
    }

    // 2. Signup Logic
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = signupForm.fullname.value.trim();
            const email = signupForm.email.value.trim();
            const password = signupForm.password.value;
            const confirmPassword = signupForm.confirmPassword.value;

            if (!name) return window.showToast('Full Name is required.', 'error');
            if (!email) return window.showToast('Email Address is required.', 'error');
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return window.showToast('Please enter a valid email address.', 'error');
            
            if (password.length < 6) return window.showToast('Password must be at least 6 characters.', 'error');
            if (password !== confirmPassword) return window.showToast('Passwords do not match.', 'error');

            const submitBtn = signupForm.querySelector('button[type="submit"]');

            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Profile...';
                submitBtn.disabled = true;
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                await syncUserToFirestore(userCredential.user);
                
                window.location.href = 'index.html';
            } catch (error) {
                showAuthError(error.code);
            } finally {
                submitBtn.innerText = 'Create Account';
                submitBtn.disabled = false;
            }
        });
    }

    // 3. Google Login
    if (googleBtn) {
        googleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const originalHtml = googleBtn.innerHTML;
                googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                googleBtn.disabled = true;
                
                const result = await signInWithPopup(auth, googleProvider);
                
                // Secure Firestore Role check: Google logins MUST be restricted to standard users ONLY
                const userRef = doc(db, 'users', result.user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    await auth.signOut();
                    window.showToast('Google logins are prohibited for curator access. Please sign in using your designated email and password credentials.', 'error');
                    googleBtn.disabled = false;
                    googleBtn.innerHTML = originalHtml;
                    return;
                }
                
                await syncUserToFirestore(result.user);
                window.location.href = 'index.html';
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                    showAuthError(error.code);
                }
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="google-icon" style="width: 20px; height: 20px; margin-right: 10px;">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                </svg> Sign in with Google`;
            }
        });
    }

    // 4. Reset Password
    if (forgotBtn) {
        forgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('forgotPasswordModal');
            if(modal) {
                modal.classList.add('active');
            }
        });

        const forgotForm = document.getElementById('forgotPasswordForm');
        if(forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = forgotForm.resetEmail.value.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return window.showToast("Invalid email format.", "error");
                }
                
                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                try {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                    submitBtn.disabled = true;
                    await sendPasswordResetEmail(auth, email);
                    window.showToast("A reset link has been sent to your email.");
                    document.getElementById('forgotPasswordModal').classList.remove('active');
                    forgotForm.reset();
                } catch (error) {
                    showAuthError(error.code);
                } finally {
                    submitBtn.innerText = 'Send Reset Link';
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Close modal logic
        const closeForgotBtn = document.getElementById('closeForgotModal');
        if(closeForgotBtn) {
            closeForgotBtn.onclick = (e) => {
                e.preventDefault();
                document.getElementById('forgotPasswordModal').classList.remove('active');
            };
        }
    }

    function showAuthError(code) {
        let message = "Authentication failed. Please check your credentials.";
        switch (code) {
            case 'auth/invalid-email': message = "Invalid email format."; break;
            case 'auth/invalid-credential': message = "Invalid email or password."; break;
            case 'auth/user-not-found': message = "No user found with this email."; break;
            case 'auth/wrong-password': message = "Incorrect password."; break;
            case 'auth/email-already-in-use': message = "This email is already taken."; break;
            case 'auth/weak-password': message = "Password must be at least 6 characters."; break;
            case 'auth/too-many-requests': message = "Too many attempts. Try again later."; break;
        }
        window.showToast(message, 'error');
    }
});
