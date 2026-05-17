import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Immediately inject a luxurious loading overlay to prevent flash of restricted content
const injectSecurityCurtain = () => {
    const curtain = document.createElement('div');
    curtain.id = 'adminSecurityCurtain';
    curtain.style.position = 'fixed';
    curtain.style.top = '0';
    curtain.style.left = '0';
    curtain.style.width = '100vw';
    curtain.style.height = '100vh';
    curtain.style.background = '#0b0b0b';
    curtain.style.zIndex = '99999';
    curtain.style.display = 'flex';
    curtain.style.flexDirection = 'column';
    curtain.style.alignItems = 'center';
    curtain.style.justifyContent = 'center';
    curtain.style.transition = 'opacity 0.5s ease, visibility 0.5s ease';
    
    curtain.innerHTML = `
        <div style="text-align: center; font-family: 'Playfair Display', serif; color: #fff;">
            <h2 style="font-size: 1.8rem; letter-spacing: 2px; margin-bottom: 20px; font-weight: 400; text-transform: uppercase;">Atelier CHENARI</h2>
            <div class="security-spinner" style="width: 30px; height: 30px; border: 2px solid rgba(255,255,255,0.1); border-top: 2px solid #fff; border-radius: 50%; margin: 0 auto; animation: securitySpin 1s linear infinite;"></div>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-top: 20px;">Checking permissions...</p>
        </div>
        <style>
            @keyframes securitySpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.documentElement.appendChild(curtain);
};

injectSecurityCurtain();

// Render centered modern security access denied modal
const showAccessDeniedModal = (message, forceSignOut = false) => {
    const curtain = document.getElementById('adminSecurityCurtain');
    if (!curtain) return;

    curtain.innerHTML = `
        <div class="security-card-modal" style="
            max-width: 450px;
            width: 90%;
            background: rgba(18, 18, 18, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
            font-family: 'Inter', sans-serif;
        ">
            <div style="
                width: 70px;
                height: 70px;
                background: rgba(255, 59, 48, 0.08);
                border: 1px solid rgba(255, 59, 48, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px auto;
                color: #ff3b30;
                font-size: 2rem;
                box-shadow: 0 0 20px rgba(255, 59, 48, 0.1);
            ">
                <i class="fas fa-lock"></i>
            </div>
            <h2 style="
                font-family: 'Playfair Display', serif;
                color: #fff;
                font-size: 1.8rem;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
                font-weight: 400;
            ">Access Denied</h2>
            <p style="
                color: #a0a0a0;
                font-size: 0.9rem;
                line-height: 1.6;
                margin-bottom: 30px;
            ">${message}</p>
            <button id="securityHomeBtn" style="
                width: 100%;
                padding: 14px 28px;
                background: #fff;
                color: #000;
                border: none;
                border-radius: 6px;
                font-family: 'Inter', sans-serif;
                font-size: 0.75rem;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                cursor: pointer;
                transition: background 0.2s, transform 0.2s;
            ">Go Back Home</button>
        </div>
        <style>
            #adminSecurityCurtain {
                background: rgba(10, 10, 10, 0.8) !important;
                backdrop-filter: blur(15px) !important;
            }
        </style>
    `;

    // Smooth card scale-up and opacity fade-in
    const card = curtain.querySelector('.security-card-modal');
    setTimeout(() => {
        if (card) {
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';
        }
    }, 50);

    const homeBtn = curtain.querySelector('#securityHomeBtn');
    if (homeBtn) {
        homeBtn.onmouseover = () => { homeBtn.style.background = '#e5e5e5'; };
        homeBtn.onmouseout = () => { homeBtn.style.background = '#fff'; };
        homeBtn.onclick = async () => {
            // Animate card scale-down and opacity fade-out
            if (card) {
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0';
            }
            curtain.style.opacity = '0';
            curtain.style.visibility = 'hidden';
            
            if (forceSignOut) {
                await signOut(auth);
            }
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        };
    }
};

// Render centered modern curator login popup modal
const showSecurityCuratorLoginModal = () => {
    const curtain = document.getElementById('adminSecurityCurtain');
    if (!curtain) return;

    curtain.innerHTML = `
        <div class="security-card-modal login-modal" style="
            max-width: 420px;
            width: 90%;
            background: rgba(18, 18, 18, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
            font-family: 'Inter', sans-serif;
            text-align: center;
        ">
            <div style="
                width: 70px;
                height: 70px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px auto;
                color: #fff;
                font-size: 1.8rem;
            ">
                <i class="fas fa-key"></i>
            </div>
            <h2 style="
                font-family: 'Playfair Display', serif;
                color: #fff;
                font-size: 1.6rem;
                letter-spacing: 1px;
                margin-bottom: 8px;
                font-weight: 400;
                text-transform: uppercase;
            ">CHENARI Portal</h2>
            <p style="
                color: #888;
                font-size: 0.75rem;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 30px;
            ">Curator Verification Required</p>
            
            <form id="securityLoginForm" style="text-align: left;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #a0a0a0; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Email Address</label>
                    <input type="email" id="securityEmail" required style="
                        width: 100%;
                        padding: 12px 16px;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 6px;
                        color: #fff;
                        font-size: 0.85rem;
                        font-family: 'Inter', sans-serif;
                        box-sizing: border-box;
                        transition: border-color 0.2s;
                    " placeholder="curator@chenari.com">
                </div>
                <div style="margin-bottom: 30px;">
                    <label style="display: block; color: #a0a0a0; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Password</label>
                    <input type="password" id="securityPassword" required style="
                        width: 100%;
                        padding: 12px 16px;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 6px;
                        color: #fff;
                        font-size: 0.85rem;
                        font-family: 'Inter', sans-serif;
                        box-sizing: border-box;
                        transition: border-color 0.2s;
                    " placeholder="••••••••">
                </div>
                
                <div id="securityLoginError" style="
                    color: #ff3b30;
                    font-size: 0.8rem;
                    margin-bottom: 20px;
                    text-align: center;
                    display: none;
                "></div>

                <button type="submit" id="securityLoginBtn" style="
                    width: 100%;
                    padding: 14px 28px;
                    background: #fff;
                    color: #000;
                    border: none;
                    border-radius: 6px;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                ">Unlock Portal</button>
            </form>
        </div>
        <style>
            #adminSecurityCurtain {
                background: rgba(10, 10, 10, 0.8) !important;
                backdrop-filter: blur(15px) !important;
            }
            .security-card-modal input:focus {
                outline: none;
                border-color: rgba(255,255,255,0.3) !important;
            }
        </style>
    `;

    // Smooth card scale-up and opacity fade-in
    const card = curtain.querySelector('.security-card-modal');
    setTimeout(() => {
        if (card) {
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';
        }
    }, 50);

    const loginForm = curtain.querySelector('#securityLoginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = curtain.querySelector('#securityEmail').value.trim();
            const password = curtain.querySelector('#securityPassword').value;
            const errorDiv = curtain.querySelector('#securityLoginError');
            const submitBtn = curtain.querySelector('#securityLoginBtn');

            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
                submitBtn.disabled = true;
                errorDiv.style.display = 'none';

                // Authenticate strictly via Firebase Authentication
                await signInWithEmailAndPassword(auth, email, password);
                // On successful authentication, the reactive onAuthStateChanged will handle the rest!
            } catch (err) {
                console.error("Popup login failure:", err);
                let msg = "Invalid email or password.";
                if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Try again later.";
                errorDiv.innerText = msg;
                errorDiv.style.display = 'block';
                submitBtn.innerHTML = 'Unlock Portal';
                submitBtn.disabled = false;
            }
        };
    }
};

// Route Protection Logic
onAuthStateChanged(auth, async (user) => {
    const curtain = document.getElementById('adminSecurityCurtain');
    
    if (!user) {
        // Unauthenticated -> Show login popup modal instead of page redirect
        showSecurityCuratorLoginModal();
        return;
    }

    // Google Sign-In check: Google users must NEVER access the admin panel under any circumstances
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (isGoogleUser) {
        showAccessDeniedModal(
            "Google authenticated accounts are strictly prohibited from accessing the curator dashboard. Please sign in using your designated email and password credentials.",
            true
        );
        return;
    }
    
    try {
        // Fetch real role from Firestore (Bulletproof check)
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.role === 'admin') {
                // Admin authorized -> Add authenticated reveal class to body
                document.body.classList.add('authenticated-admin');
                
                // Fade out security curtain
                if (curtain) {
                    curtain.style.opacity = '0';
                    curtain.style.visibility = 'hidden';
                    setTimeout(() => curtain.remove(), 500);
                }
                return;
            }
        }
        
        // Non-admin or doc not found -> Show modern Access Denied modal
        showAccessDeniedModal(
            "Exclusive Atelier Curators Only. You are not authorized to access this page.",
            false
        );
        
    } catch (error) {
        console.error("Route Guard Security Error:", error);
        window.location.href = 'index.html';
    }
});

// Centered luxury confirmation logout modal popup
const showAdminLogoutConfirmationModal = () => {
    let curtain = document.getElementById('adminSecurityCurtain');
    if (!curtain) {
        curtain = document.createElement('div');
        curtain.id = 'adminSecurityCurtain';
        curtain.style.position = 'fixed';
        curtain.style.top = '0';
        curtain.style.left = '0';
        curtain.style.width = '100vw';
        curtain.style.height = '100vh';
        curtain.style.background = 'rgba(10, 10, 10, 0.8)';
        curtain.style.backdropFilter = 'blur(15px)';
        curtain.style.zIndex = '99999';
        curtain.style.display = 'flex';
        curtain.style.alignItems = 'center';
        curtain.style.justifyContent = 'center';
        curtain.style.transition = 'opacity 0.5s ease, visibility 0.5s ease';
        document.body.appendChild(curtain);
    } else {
        curtain.style.opacity = '1';
        curtain.style.visibility = 'visible';
    }

    curtain.innerHTML = `
        <div class="security-card-modal logout-confirm-modal" style="
            max-width: 400px;
            width: 90%;
            background: rgba(18, 18, 18, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
            font-family: 'Inter', sans-serif;
        ">
            <div style="
                width: 70px;
                height: 70px;
                background: rgba(255, 59, 48, 0.08);
                border: 1px solid rgba(255, 59, 48, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px auto;
                color: #ff3b30;
                font-size: 1.8rem;
            ">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <h2 style="
                font-family: 'Playfair Display', serif;
                color: #fff;
                font-size: 1.6rem;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
                font-weight: 400;
            ">Confirm Logout</h2>
            <p style="
                color: #a0a0a0;
                font-size: 0.85rem;
                line-height: 1.6;
                margin-bottom: 30px;
            ">Are you sure you want to fully log out of your administrative CHENARI session?</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="adminConfirmLogoutBtn" style="
                    flex: 1;
                    padding: 12px 20px;
                    background: #ff3b30;
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.2s;
                ">Log Out</button>
                <button id="adminCancelLogoutBtn" style="
                    flex: 1;
                    padding: 12px 20px;
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.2s;
                ">Cancel</button>
            </div>
        </div>
    `;

    // Smooth card scale-up and opacity fade-in
    const card = curtain.querySelector('.security-card-modal');
    setTimeout(() => {
        if (card) {
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';
        }
    }, 50);

    const cancelBtn = curtain.querySelector('#adminCancelLogoutBtn');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (card) {
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0';
            }
            setTimeout(() => {
                curtain.style.opacity = '0';
                curtain.style.visibility = 'hidden';
            }, 300);
        };
    }

    const confirmBtn = curtain.querySelector('#adminConfirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            confirmBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;

            try {
                // 1. Fully sign out from Firebase Authentication
                await signOut(auth);

                // 2. Clear all browser storages
                localStorage.clear();
                sessionStorage.clear();

                // 3. Smooth card scale-down and opacity fade-out
                if (card) {
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0';
                }
                curtain.style.opacity = '0';
                curtain.style.visibility = 'hidden';

                // 4. Redirect to homepage
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);

            } catch (err) {
                console.error("Administrative logout failure:", err);
                window.location.href = 'index.html';
            }
        };
    }
};

// Bind to DOMContentLoaded to capture all admin sidebar footer logout button clicks programmatically
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.querySelector('.sidebar-footer a[href="index.html"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAdminLogoutConfirmationModal();
        });
    }
});
