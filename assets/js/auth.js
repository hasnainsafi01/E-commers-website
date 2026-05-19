import { auth, googleProvider, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper: Save/Update User in Firestore
const syncUserToFirestore = async (user) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || 'Luxury Connoisseur',
            displayName: user.displayName || 'Luxury Connoisseur',
            email: user.email,
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`,
            role: 'user',
            phone: '',
            country: '',
            city: '',
            province: '',
            streetAddress: '',
            houseNumber: '',
            flatNumber: '',
            postalCode: '',
            notes: '',
            profileCompleted: false,
            welcomeShown: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            bio: 'Welcome to your premium MyMart profile.'
        });
    } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
};

// Global Utility for Toast (Only for general SSO and Modal alerts)
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

// Inject Premium Inline Validation CSS Styles
const injectValidationStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .field-error-message {
            color: #ff3b30;
            font-size: 0.72rem;
            margin-top: 6px;
            font-family: 'Inter', sans-serif;
            opacity: 0;
            transform: translateY(-5px);
            transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: block;
            font-weight: 500;
        }
        .field-error-message.visible {
            opacity: 1;
            transform: translateY(0);
        }
        .form-group input.field-error-input {
            border-color: #ff3b30 !important;
            background-color: rgba(255, 59, 48, 0.02) !important;
        }
        .form-group input.field-error-input:focus {
            box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.15) !important;
        }
        .shake-animation {
            animation: cardShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes cardShake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
    `;
    document.head.appendChild(style);
};

injectValidationStyles();

// Utility: Show inline error below a specific field
const showFieldError = (input, message) => {
    if (!input) return;
    input.classList.add('field-error-input');
    
    const group = input.closest('.form-group');
    if (!group) return;
    
    let errorElem = group.querySelector('.field-error-message');
    if (!errorElem) {
        errorElem = document.createElement('div');
        errorElem.className = 'field-error-message';
        group.appendChild(errorElem);
    }
    
    errorElem.innerText = message;
    setTimeout(() => {
        errorElem.classList.add('visible');
    }, 10);
};

// Utility: Clear error state on an input field
const clearFieldError = (input) => {
    if (!input) return;
    input.classList.remove('field-error-input');
    
    const group = input.closest('.form-group');
    if (!group) return;
    
    const errorElem = group.querySelector('.field-error-message');
    if (errorElem) {
        errorElem.classList.remove('visible');
        setTimeout(() => errorElem.remove(), 250);
    }
};

// Utility: Smooth Shake on card
const triggerCardShake = (form) => {
    const card = form.closest('.login-card');
    if (card) {
        card.classList.remove('shake-animation');
        void card.offsetWidth; // Force layout recalculation to restart animation
        card.classList.add('shake-animation');
        setTimeout(() => card.classList.remove('shake-animation'), 450);
    }
};

// Field Validation Helpers
const validateEmailFormat = (email) => {
    if (!email) return "Email Address is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Invalid email address";
    return null;
};

const validatePasswordInput = (password, isSignup = false) => {
    if (!password) return "Password is required.";
    if (isSignup && password.length < 6) return "Password must be at least 6 characters";
    return null;
};

const validateNameInput = (name) => {
    if (!name) return "Full Name is required.";
    return null;
};

const validateConfirmPasswordInput = (confirm, password) => {
    if (!confirm) return "Please confirm your password.";
    if (confirm !== password) return "Passwords do not match.";
    return null;
};

// Add real-time typing listeners to clear/verify errors dynamically
const attachRealtimeValidations = (form, isSignup = false) => {
    if (!form) return;
    form.setAttribute('novalidate', 'true'); // Disable default browser tooltips

    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        // Clear red border instantly on typing
        input.addEventListener('input', () => {
            clearFieldError(input);
        });

        // Revalidate on blur for seamless validation UX
        input.addEventListener('blur', () => {
            const val = input.value.trim();
            if (input.type === 'email') {
                const err = validateEmailFormat(val);
                if (err) showFieldError(input, err);
            } else if (input.id === 'fullname' && isSignup) {
                const err = validateNameInput(val);
                if (err) showFieldError(input, err);
            } else if (input.id === 'password') {
                const err = validatePasswordInput(input.value, isSignup);
                if (err) showFieldError(input, err);
            } else if (input.id === 'confirmPassword' && isSignup) {
                const err = validateConfirmPasswordInput(input.value, form.password.value);
                if (err) showFieldError(input, err);
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleBtn = document.getElementById('googleBtn');
    const forgotBtn = document.getElementById('forgotPass');

    // Attach real-time validators
    if (loginForm) attachRealtimeValidations(loginForm, false);
    if (signupForm) attachRealtimeValidations(signupForm, true);

    // 1. Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear existing validations
            const emailInput = loginForm.email;
            const passwordInput = loginForm.password;
            clearFieldError(emailInput);
            clearFieldError(passwordInput);

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Strict inline client validations
            let hasError = false;
            const emailErr = validateEmailFormat(email);
            if (emailErr) {
                showFieldError(emailInput, emailErr);
                hasError = true;
            }

            const passErr = validatePasswordInput(password, false);
            if (passErr) {
                showFieldError(passwordInput, passErr);
                hasError = true;
            }

            if (hasError) {
                triggerCardShake(loginForm);
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                if (window.showMyMartLoader) {
                    window.showMyMartLoader("Authenticating Account...");
                }
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
                submitBtn.disabled = true;

                // 1. Firebase Authentication ONLY verification
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                // Clear conflict flags
                sessionStorage.removeItem('mymart_admin_just_logged_out');
                sessionStorage.removeItem('mymart_logged_in_admin');

                // 2. Failsafe Firestore Role Fetch (No Firestore issue will block successful auth login)
                let role = 'user';
                try {
                    await syncUserToFirestore(userCredential.user);
                    const userRef = doc(db, 'users', userCredential.user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        role = userSnap.data().role || 'user';
                    }
                } catch (firestoreErr) {
                    console.warn("Failsafe Firestore role resolve failed, defaulting to 'user':", firestoreErr);
                }

                // 3. Dynamic redirection & admin block
                if (role === 'admin') {
                    // Prevent admin role session leakage in storefront
                    await signOut(auth);
                    if (window.hideMyMartLoader) {
                        window.hideMyMartLoader();
                    }
                    localStorage.removeItem('mymart_logged_in_user');
                    showFieldError(emailInput, "Please use Admin Panel Login");
                    triggerCardShake(loginForm);
                    submitBtn.innerHTML = 'Login';
                    submitBtn.disabled = false;
                } else {
                    window.location.href = 'index.html';
                }
            } catch (authError) {
                console.error("Firebase Authentication Failure:", authError);
                triggerCardShake(loginForm);

                if (window.hideMyMartLoader) {
                    window.hideMyMartLoader();
                }

                // Elegant resolving of generic credentials block by querying Firestore
                let resolved = false;
                if (authError.code === 'auth/invalid-credential') {
                    try {
                        const q = query(collection(db, 'users'), where('email', '==', email));
                        const querySnap = await getDocs(q);
                        if (querySnap.empty) {
                            showFieldError(emailInput, "Account not found");
                        } else {
                            showFieldError(passwordInput, "Incorrect password");
                        }
                        resolved = true;
                    } catch (fsErr) {
                        console.error("Failsafe Firestore check failed:", fsErr);
                    }
                }

                if (!resolved) {
                    // Fallback to standard field mapping
                    switch (authError.code) {
                        case 'auth/invalid-email':
                            showFieldError(emailInput, "Invalid email address");
                            break;
                        case 'auth/user-not-found':
                            showFieldError(emailInput, "Account not found");
                            break;
                        case 'auth/wrong-password':
                            showFieldError(passwordInput, "Incorrect password");
                            break;
                        case 'auth/too-many-requests':
                            showFieldError(passwordInput, "Too many attempts. Try again later.");
                            break;
                        default:
                            showFieldError(emailInput, "Invalid email address or password.");
                    }
                }
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
            
            const nameInput = signupForm.fullname;
            const emailInput = signupForm.email;
            const passwordInput = signupForm.password;
            const confirmInput = signupForm.confirmPassword;

            clearFieldError(nameInput);
            clearFieldError(emailInput);
            clearFieldError(passwordInput);
            clearFieldError(confirmInput);

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmInput.value;

            // Strict client validations
            let hasError = false;
            
            const nameErr = validateNameInput(name);
            if (nameErr) {
                showFieldError(nameInput, nameErr);
                hasError = true;
            }

            const emailErr = validateEmailFormat(email);
            if (emailErr) {
                showFieldError(emailInput, emailErr);
                hasError = true;
            }

            const passErr = validatePasswordInput(password, true);
            if (passErr) {
                showFieldError(passwordInput, passErr);
                hasError = true;
            }

            const confirmErr = validateConfirmPasswordInput(confirmPassword, password);
            if (confirmErr) {
                showFieldError(confirmInput, confirmErr);
                hasError = true;
            }

            if (hasError) {
                triggerCardShake(signupForm);
                return;
            }

            const submitBtn = signupForm.querySelector('button[type="submit"]');

            try {
                if (window.showMyMartLoader) {
                    window.showMyMartLoader("Creating Premium Profile...");
                }
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Profile...';
                submitBtn.disabled = true;
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // Clear conflict flags
                sessionStorage.removeItem('mymart_admin_just_logged_out');
                sessionStorage.removeItem('mymart_logged_in_admin');

                await updateProfile(userCredential.user, { displayName: name });
                await syncUserToFirestore(userCredential.user);
                
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Firebase Signup Failure:", error);
                triggerCardShake(signupForm);

                if (window.hideMyMartLoader) {
                    window.hideMyMartLoader();
                }

                switch (error.code) {
                    case 'auth/email-already-in-use':
                        showFieldError(emailInput, "Email already exists");
                        break;
                    case 'auth/weak-password':
                        showFieldError(passwordInput, "Password must be at least 6 characters");
                        break;
                    case 'auth/invalid-email':
                        showFieldError(emailInput, "Invalid email address");
                        break;
                    default:
                        showFieldError(emailInput, "Registration failed. Try again.");
                }
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
            const originalHtml = googleBtn.innerHTML;
            try {
                if (window.showMyMartLoader) {
                    window.showMyMartLoader("Connecting Google Account...");
                }
                googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                googleBtn.disabled = true;
                
                const result = await signInWithPopup(auth, googleProvider);
                
                // Clear conflict flags
                sessionStorage.removeItem('mymart_admin_just_logged_out');
                sessionStorage.removeItem('mymart_logged_in_admin');
                
                // Secure Firestore Role check: Google logins MUST be restricted to standard users ONLY
                const userRef = doc(db, 'users', result.user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    await auth.signOut();
                    if (window.hideMyMartLoader) {
                        window.hideMyMartLoader();
                    }
                    window.showToast('Google logins are prohibited for curator access. Please sign in using your designated email and password credentials.', 'error');
                    googleBtn.disabled = false;
                    googleBtn.innerHTML = originalHtml;
                    return;
                }
                
                await syncUserToFirestore(result.user);
                window.location.href = 'index.html';
            } catch (error) {
                if (window.hideMyMartLoader) {
                    window.hideMyMartLoader();
                }
                if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                    window.showToast('Google authentication failed. Please try again.', 'error');
                }
                googleBtn.disabled = false;
                googleBtn.innerHTML = originalHtml;
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
                    window.showToast("Invalid email format.", "error");
                    return;
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
                    window.showToast("Password reset failed. Please check the email entered.", "error");
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
});
