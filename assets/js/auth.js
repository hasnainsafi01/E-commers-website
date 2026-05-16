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
            displayName: user.displayName || 'Luxury Connoisseur',
            email: user.email,
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`,
            role: 'user', // default role
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            bio: 'Welcome to your premium CHENARI profile.'
        });
    } else {
        // Update last login
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
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
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
                submitBtn.disabled = true;
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await syncUserToFirestore(userCredential.user);
                window.location.href = 'index.html';
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
            const name = signupForm.fullname.value;
            const email = signupForm.email.value;
            const password = signupForm.password.value;
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
        googleBtn.addEventListener('click', async () => {
            try {
                const result = await signInWithPopup(auth, googleProvider);
                await syncUserToFirestore(result.user);
                window.location.href = 'index.html';
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    showAuthError(error.code);
                }
            }
        });
    }

    // 4. Reset Password
    if (forgotBtn) {
        forgotBtn.addEventListener('click', async () => {
            const email = prompt("Enter your registered email address:");
            if (email) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    alert("A reset link has been sent to your email.");
                } catch (error) {
                    showAuthError(error.code);
                }
            }
        });
    }

    function showAuthError(code) {
        let message = "Authentication failed. Please check your credentials.";
        switch (code) {
            case 'auth/invalid-email': message = "Invalid email format."; break;
            case 'auth/user-not-found': message = "No user found with this email."; break;
            case 'auth/wrong-password': message = "Incorrect password."; break;
            case 'auth/email-already-in-use': message = "This email is already taken."; break;
            case 'auth/weak-password': message = "Password must be at least 6 characters."; break;
        }
        alert(message);
    }
});
