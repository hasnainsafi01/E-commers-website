import { db, auth, googleProvider } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Clean URL routing redirect for admin routes
const pathname = window.location.pathname.toLowerCase();
if (pathname.endsWith('/admin') || pathname.endsWith('/admin/') || pathname.includes('/admin-dashboard')) {
    window.location.href = 'admin.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;

    let currentUser = null;
    let pendingAction = null;

    // Welcome Popup Implementation (Declared at the top to prevent temporal dead zone ReferenceErrors)
    const showWelcomePopup = (userName, isFirstVisit) => {
        const greeting = isFirstVisit 
            ? `Welcome to CHENARI, ${userName}`
            : `Welcome Back to CHENARI, ${userName}`;

        const popupHTML = `
            <div id="chenariWelcomeOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(10, 10, 10, 0.4);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <div class="welcome-card" style="
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(25px);
                    -webkit-backdrop-filter: blur(25px);
                    border-radius: 20px;
                    padding: 50px 60px;
                    width: 90%;
                    max-width: 480px;
                    text-align: center;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.12);
                    transform: translateY(20px) scale(0.95);
                    transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0;
                    box-sizing: border-box;
                ">
                    <!-- CHENARI Premium Logo with Custom Letter Coloring -->
                    <div style="font-size: 2.6rem; font-weight: 700; letter-spacing: 6px; display: inline-flex; margin-bottom: 25px; font-family: 'Playfair Display', serif;">
                        <span style="color: #4285F4;">C</span>
                        <span style="color: #ea4335; margin-left: 2px;">H</span>
                        <span style="color: #34a853; margin-left: 2px;">E</span>
                        <span style="color: #fbbc05; margin-left: 2px;">N</span>
                        <span style="color: #ff5a5f; margin-left: 2px;">A</span>
                        <span style="color: #1b5e20; margin-left: 2px;">R</span>
                        <span style="color: #1565c0; margin-left: 2px;">I</span>
                    </div>

                    <!-- Welcome Title -->
                    <h2 class="serif" style="
                        color: #111;
                        font-size: 1.8rem;
                        line-height: 1.3;
                        margin: 0 0 12px 0;
                        font-weight: 400;
                        letter-spacing: 0.5px;
                    ">${greeting}</h2>

                    <!-- Subtitle -->
                    <p style="
                        color: #666;
                        font-size: 0.88rem;
                        font-family: 'Inter', sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        letter-spacing: 0.5px;
                        font-weight: 500;
                        text-transform: uppercase;
                    ">Your luxury shopping destination awaits</p>
                </div>
            </div>
            <style>
                [data-theme="dark"] #chenariWelcomeOverlay .welcome-card {
                    background: rgba(18, 18, 18, 0.85) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4) !important;
                }
                [data-theme="dark"] #chenariWelcomeOverlay h2 {
                    color: #fff !important;
                }
                [data-theme="dark"] #chenariWelcomeOverlay p {
                    color: #aaa !important;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);
        const overlay = document.getElementById('chenariWelcomeOverlay');
        const card = overlay.querySelector('.welcome-card');

        // Trigger smooth fade and scale in
        setTimeout(() => {
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
            console.log("Welcome Popup Rendered Successfully - Target Greeting:", greeting);
        }, 100);

        // Auto close after 2.5 seconds
        setTimeout(() => {
            card.style.transform = 'translateY(-15px) scale(0.97)';
            card.style.opacity = '0';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            setTimeout(() => overlay.remove(), 600);
            console.log("Welcome Popup Closed Automatically.");
        }, 2500);
    };

    // Listen for Auth State
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (window.updateChenariLoaderText) {
            window.updateChenariLoaderText("Authenticating Account...");
        }

        // If admin just logged out, suppress all auth-side effects and hide loader only
        if (sessionStorage.getItem('chenari_admin_just_logged_out') === 'true') {
            if (window.hideChenariLoader) window.hideChenariLoader();
            return;
        }

        // Live sync mobile drawer auth interface
        if (window.updateDrawerAuthUI) {
            window.updateDrawerAuthUI(user);
        }

        if (user) {
            // Check for pending action in localStorage
            const pending = localStorage.getItem('chenari_pending_action');
            if (pending) {
                localStorage.removeItem('chenari_pending_action');
                try {
                    const action = JSON.parse(pending);
                    console.log("Found pending action to execute post-login:", action);
                    
                    // Show Login Successful Toast
                    window.showToast("Login successful");
                    
                    // Execute action with slight delay to ensure other modules are loaded
                    setTimeout(async () => {
                        if (action.type === 'cart') {
                            if (window.addToCart) {
                                await window.addToCart(action.data);
                            }
                        } else if (action.type === 'fav') {
                            if (window.handleFavClick) {
                                const btn = document.querySelector(`.product-card[data-id="${action.data.id}"] .fav-btn`) || document.createElement('button');
                                await window.handleFavClick(btn, action.data);
                            }
                        } else if (action.type === 'nav') {
                            window.location.href = action.data.url;
                        }
                    }, 800);
                } catch (pe) {
                    console.error("Failed to parse pending action:", pe);
                }
            }

            // Prevent repeated popups during the same active browser session
            const sessionKey = `chenari_greeted_${user.uid}`;
            if (sessionStorage.getItem(sessionKey)) {
                console.log("User already greeted this session - Greet Blocked. UID:", user.uid);
                if (window.hideChenariLoader) {
                    window.hideChenariLoader();
                }
                return;
            }

            console.log("Auth state loaded successfully. Welcome Popup checks running - UID:", user.uid);

            try {
                // Fetch dynamic name with secure fallback tree:
                // 1. Firestore name/displayName -> 2. Auth displayName -> 3. Email username -> 4. Guest
                let userName = user.displayName || '';
                if (!userName && user.email) {
                    userName = user.email.split('@')[0];
                }

                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        userName = userData.name || userData.displayName || userName || 'Guest';
                    }
                } catch (fsErr) {
                    console.warn("Firestore welcome name check skipped/failed:", fsErr);
                }

                if (!userName || userName === 'Guest') {
                    userName = 'Guest';
                }

                // Slice first name for dynamic premium onboarding look
                if (userName && userName !== 'Guest') {
                    userName = userName.split(' ')[0];
                }

                console.log("Welcome Popup Target User Name Resolved:", userName);

                // Check localStorage using required visitedUser_UID flag format
                const returnKey = `visitedUser_${user.uid}`;
                const isFirstVisit = !localStorage.getItem(returnKey);

                console.log("Welcome Popup First Visit Status:", isFirstVisit ? "FIRST TIME" : "RETURNING VISIT");

                // Display dynamic luxury welcome popup modal
                showWelcomePopup(userName, isFirstVisit);

                // Set visited flags to prevent duplicate greetings
                localStorage.setItem(returnKey, 'true');
                sessionStorage.setItem(sessionKey, 'true');

            } catch (e) {
                console.error("Welcome popup system trigger failed:", e);
            } finally {
                if (window.hideChenariLoader) {
                    window.hideChenariLoader();
                }
            }
        } else {
            console.log("Auth State Changed: Guest user (No authenticated session).");
            if (window.hideChenariLoader) {
                window.hideChenariLoader();
            }
            
            // Trigger login modal if requested by a redirect
            if (sessionStorage.getItem('chenari_trigger_login_modal') === 'true') {
                sessionStorage.removeItem('chenari_trigger_login_modal');
                setTimeout(() => {
                    if (window.showLoginRequiredModal) {
                        window.showLoginRequiredModal({ type: 'nav', data: { url: 'cart.html' } });
                    }
                }, 500);
            }
        }
    });

    // 1. Sticky Navbar
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        }
    });

    // 2. Premium Mobile Menu & Navigation Drawer Injection & Events
    const injectMobileDrawer = () => {
        if (document.getElementById('mobileDrawer')) return;
        const drawerHTML = `
            <div id="mobileDrawer" class="mobile-drawer-overlay">
                <div class="mobile-drawer-content">
                    <div class="drawer-header">
                        <a href="index.html" class="logo">
                            <span>C</span><span>H</span><span>E</span><span>N</span><span>A</span><span>R</span><span>I</span>
                        </a>
                        <button class="drawer-close-btn" id="drawerCloseBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="drawer-body">
                        <!-- Navigation Links -->
                        <div class="drawer-section">
                            <h4 class="drawer-section-title">Navigation</h4>
                            <ul class="drawer-links">
                                <li><a href="index.html"><i class="fas fa-home"></i> Home</a></li>
                                <li><a href="products.html"><i class="fas fa-th-large"></i> Collection</a></li>
                                <li><a href="products.html?category=watches"><i class="fas fa-clock"></i> Watches</a></li>
                                <li><a href="products.html?category=bags"><i class="fas fa-shopping-bag"></i> Bags</a></li>
                                <li><a href="products.html?category=shoes"><i class="fas fa-shoe-prints"></i> Shoes</a></li>
                                <li><a href="cart.html" class="auth-guarded"><i class="fas fa-shopping-cart"></i> Bag</a></li>
                                <li><a href="favorites.html" class="auth-guarded"><i class="fas fa-heart"></i> Favorites</a></li>
                            </ul>
                        </div>
                        
                        <!-- Client Section -->
                        <div class="drawer-section">
                            <h4 class="drawer-section-title">Your Account</h4>
                            <div id="drawerAuthLinks">
                                <!-- Dynamically populated based on login status -->
                            </div>
                        </div>

                        <!-- Preferences -->
                        <div class="drawer-section">
                            <h4 class="drawer-section-title">Preferences</h4>
                            <div class="drawer-theme-toggle" id="drawerThemeToggle">
                                <span>Dark Mode</span>
                                <div class="toggle-switch">
                                    <input type="checkbox" id="drawerThemeCheckbox">
                                    <label for="drawerThemeCheckbox"></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', drawerHTML);
    };

    injectMobileDrawer();

    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const drawerThemeCheckbox = document.getElementById('drawerThemeCheckbox');

    if (mobileToggle && mobileDrawer) {
        mobileToggle.addEventListener('click', () => {
            mobileDrawer.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }

    if (drawerCloseBtn && mobileDrawer) {
        drawerCloseBtn.addEventListener('click', () => {
            mobileDrawer.classList.remove('active');
            document.body.style.overflow = '';
        });
        mobileDrawer.addEventListener('click', (e) => {
            if (e.target === mobileDrawer) {
                mobileDrawer.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // 2b. Live Auth Status Renderer for Mobile Drawer
    window.updateDrawerAuthUI = async (user) => {
        const container = document.getElementById('drawerAuthLinks');
        if (!container) return;

        if (user) {
            let name = user.displayName || user.email?.split('@')[0] || 'Guest';
            let isAdmin = false;
            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    const data = snap.data();
                    name = data.name || data.displayName || name;
                    isAdmin = (data.role === 'admin');
                }
            } catch (err) {
                console.warn("Drawer role fetch failed:", err);
            }

            container.innerHTML = `
                <div style="padding: 10px 0; border-bottom: 1px solid var(--nav-border); margin-bottom: 15px;">
                    <span style="font-size: 0.95rem; color: var(--text-color); opacity: 0.8; font-weight: 500;">Hello, <span style="font-weight: 600; color: var(--icon-hover);">${name}</span></span>
                </div>
                
                ${isAdmin ? `
                    <a href="admin.html" class="drawer-admin-btn">
                        <i class="fas fa-crown"></i> Admin Portal
                    </a>
                ` : ''}
                
                <ul class="drawer-links" style="margin-bottom: 20px;">
                    <li><a href="profile.html" class="auth-guarded"><i class="fas fa-user-circle"></i> Profile</a></li>
                    <li><a href="cart.html" class="auth-guarded"><i class="fas fa-shopping-basket"></i> View Bag</a></li>
                    <li><a href="favorites.html" class="auth-guarded"><i class="fas fa-heart-broken"></i> View Favorites</a></li>
                </ul>
                
                <button class="drawer-auth-btn signup" id="drawerLogoutBtn" style="border-color: var(--primary-red); color: var(--primary-red);">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            `;

            const logoutBtn = document.getElementById('drawerLogoutBtn');
            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    const drawer = document.getElementById('mobileDrawer');
                    if (drawer) {
                        drawer.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                    if (window.showLogoutModal) {
                        window.showLogoutModal();
                    } else {
                        await auth.signOut();
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = 'index.html';
                    }
                };
            }
        } else {
            container.innerHTML = `
                <a href="login.html" class="drawer-auth-btn login">Login</a>
                <a href="signup.html" class="drawer-auth-btn signup">Signup</a>
            `;
        }
    };

    // Initialize state mapping
    if (currentUser) {
        window.updateDrawerAuthUI(currentUser);
    }

    // Removed mobile search overlay logic as requested

    // 3. Theme Synchronization & Operation
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    if (drawerThemeCheckbox) {
        drawerThemeCheckbox.checked = (currentTheme === 'dark');
    }

    const updateThemeUI = (theme) => {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (theme === 'dark') {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        }
        
        if (drawerThemeCheckbox) {
            drawerThemeCheckbox.checked = (theme === 'dark');
        }
    };

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            updateThemeUI(newTheme);
        });
    }

    if (drawerThemeCheckbox) {
        drawerThemeCheckbox.addEventListener('change', () => {
            const newTheme = drawerThemeCheckbox.checked ? 'dark' : 'light';
            updateThemeUI(newTheme);
        });
    }

    // 4. Auth Modal Logic
    const injectAuthModal = () => {
        if (document.getElementById('authModal')) return;
        const modalHTML = `
            <div id="authModal" class="auth-modal-overlay">
                <div class="auth-modal-content">
                    <button class="modal-close-btn">&times;</button>
                    <div class="auth-modal-header">
                        <h2 class="serif">Join the CHENARI Circle</h2>
                        <p>Authenticate to continue your premium shopping experience and sync your selections across all devices.</p>
                    </div>
                    <div class="auth-modal-options">
                        <button id="modalGoogleBtn" class="auth-opt-btn google">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="google-icon" style="width: 20px; height: 20px; margin-right: 10px;">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                            Continue with Google
                        </button>
                        <div class="auth-divider"><span>OR</span></div>
                        <a href="login.html" class="auth-opt-btn email">
                            <i class="fas fa-envelope"></i> Login with Email
                        </a>
                        <a href="signup.html" class="auth-opt-btn signup">
                            <i class="fas fa-user-plus"></i> Create Account
                        </a>
                    </div>
                    <button class="modal-cancel-btn">Maybe Later</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('authModal');
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');
        const googleBtn = modal.querySelector('#modalGoogleBtn');

        const closeModal = () => modal.classList.remove('active');
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if(e.target === modal) closeModal(); };

        googleBtn.onclick = async () => {
            try {
                googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                await signInWithPopup(auth, googleProvider);
                closeModal();
            } catch (error) {
                console.error("Modal Google Login Error:", error);
                googleBtn.innerHTML = '<img src="..." alt="Google"> Continue with Google';
            }
        };
    };

    // Custom Premium Login Required Modal
    window.showLoginRequiredModal = (action) => {
        // Remove existing modal if any
        const existing = document.getElementById('loginRequiredModal');
        if (existing) existing.remove();

        const modalHTML = `
            <div id="loginRequiredModal" class="auth-modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(10, 10, 10, 0.4);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                z-index: 1000000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <div class="auth-modal-content" style="
                    background: rgba(255, 255, 255, 0.88);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(25px);
                    -webkit-backdrop-filter: blur(25px);
                    border-radius: 20px;
                    padding: 45px 50px;
                    width: 90%;
                    max-width: 440px;
                    text-align: center;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);
                    transform: scale(0.95) translateY(15px);
                    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                ">
                    <div style="
                        width: 64px;
                        height: 64px;
                        background: rgba(10, 10, 10, 0.03);
                        border: 1px solid rgba(10, 10, 10, 0.08);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 25px auto;
                        color: #111;
                        font-size: 1.6rem;
                    ">
                        <i class="fas fa-lock"></i>
                    </div>
                    
                    <h2 class="serif" style="
                        color: #111;
                        font-size: 1.8rem;
                        margin: 0 0 12px 0;
                        font-weight: 400;
                        letter-spacing: 0.5px;
                    ">Login Required</h2>
                    
                    <p style="
                        color: #555;
                        font-size: 0.9rem;
                        line-height: 1.6;
                        margin: 0 0 35px 0;
                    ">Please login to continue using Cart and Favorites.</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button id="modalLoginBtn" style="
                            width: 100%;
                            padding: 14px;
                            background: #111;
                            color: #fff;
                            border: none;
                            border-radius: 8px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            letter-spacing: 1.5px;
                            text-transform: uppercase;
                            cursor: pointer;
                            transition: background 0.2s, transform 0.2s;
                        ">Login</button>
                        
                        <button id="modalSignupBtn" style="
                            width: 100%;
                            padding: 14px;
                            background: transparent;
                            color: #111;
                            border: 1px solid #111;
                            border-radius: 8px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            letter-spacing: 1.5px;
                            text-transform: uppercase;
                            cursor: pointer;
                            transition: background 0.2s;
                        ">Signup</button>
                        
                        <button id="modalCancelBtn" style="
                            width: 100%;
                            padding: 14px;
                            background: transparent;
                            color: #666;
                            border: none;
                            font-size: 0.75rem;
                            font-weight: 600;
                            letter-spacing: 1px;
                            text-transform: uppercase;
                            cursor: pointer;
                        ">Cancel</button>
                    </div>
                </div>
            </div>
            <style>
                [data-theme="dark"] #loginRequiredModal .auth-modal-content {
                    background: rgba(18, 18, 18, 0.88) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4) !important;
                }
                [data-theme="dark"] #loginRequiredModal h2 {
                    color: #fff !important;
                }
                [data-theme="dark"] #loginRequiredModal p {
                    color: #aaa !important;
                }
                [data-theme="dark"] #loginRequiredModal .auth-modal-content div:first-child {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    color: #fff !important;
                }
                [data-theme="dark"] #loginRequiredModal #modalLoginBtn {
                    background: #fff !important;
                    color: #000 !important;
                }
                [data-theme="dark"] #loginRequiredModal #modalSignupBtn {
                    border-color: #fff !important;
                    color: #fff !important;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('loginRequiredModal');
        const card = modal.querySelector('.auth-modal-content');

        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            card.style.transform = 'scale(1) translateY(0)';
            card.style.opacity = '1';
        }, 50);

        const closeModal = () => {
            card.style.transform = 'scale(0.95) translateY(15px)';
            card.style.opacity = '0';
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            setTimeout(() => modal.remove(), 500);
        };

        modal.querySelector('#modalLoginBtn').onclick = () => {
            localStorage.setItem('chenari_pending_action', JSON.stringify(action));
            closeModal();
            setTimeout(() => window.location.href = 'login.html', 300);
        };

        modal.querySelector('#modalSignupBtn').onclick = () => {
            localStorage.setItem('chenari_pending_action', JSON.stringify(action));
            closeModal();
            setTimeout(() => window.location.href = 'signup.html', 300);
        };

        modal.querySelector('#modalCancelBtn').onclick = closeModal;
        modal.onclick = (e) => { if(e.target === modal) closeModal(); };
    };

    // Auth-guard for Navbar Links & Drawer Links using Event Delegation
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a.auth-guarded');
        if (link) {
            if (!currentUser) {
                e.preventDefault();
                window.showLoginRequiredModal({ type: 'nav', data: { url: link.href } });
            }
        }
    });

    const executePendingAction = () => {
        if (!pendingAction) return;
        const { type, data } = pendingAction;
        if (type === 'cart') {
            if (window.addToCart) window.addToCart(data);
            else window.showToast(`Added ${data.title} to your bag!`);
        } else if (type === 'fav') {
            if (window.handleFavClick) window.handleFavClick(data.btn, data.prod);
            else window.showToast(`Saved ${data.prod.title} to your wishlist!`);
        } else if (type === 'nav') {
            window.location.href = data.url;
        }
        pendingAction = null;
    };

    // 5. Shared Product Renderer
    const renderProductCard = (prod) => {
        const img = prod.images && prod.images.length > 0 ? prod.images[0] : 'assets/images/default.png';
        const discountTag = prod.discount > 0 ? `<span class="discount-badge">-${prod.discount}%</span>` : '';
        
        return `
            <div class="product-card" data-id="${prod.id}" style="animation: fadeInUp 0.5s ease backwards">
                <div class="product-image">
                    ${discountTag}
                    <button class="fav-btn" title="Add to Wishlist"><i class="far fa-heart"></i></button>
                    <img src="${img}" alt="${prod.title}">
                </div>
                <div class="product-info">
                    <span class="product-category">${prod.category}</span>
                    <h3 class="product-name">${prod.title}</h3>
                    <div class="product-rating">
                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">
                            <span class="current-price">$${prod.price.toLocaleString()}</span>
                        </div>
                        <button class="add-cart-btn"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
    };

    const attachListeners = (container) => {
        container.querySelectorAll('.product-card').forEach(card => {
            // Navigate to details
            card.onclick = (e) => {
                if (e.target.closest('.fav-btn') || e.target.closest('.add-cart-btn')) return;
                window.location.href = `product-details.html?id=${card.dataset.id}`;
            };

            // Fav Click
            const favBtn = card.querySelector('.fav-btn');
            favBtn.onclick = (e) => {
                e.stopPropagation();
                const prodId = card.dataset.id;
                const prodTitle = card.querySelector('.product-name').innerText;
                if (!currentUser) {
                    window.showLoginRequiredModal({ type: 'fav', data: { id: prodId, title: prodTitle } });
                } else {
                    if (window.handleFavClick) window.handleFavClick(favBtn, { id: prodId, title: prodTitle });
                    else window.showToast(`Saved to wishlist!`);
                }
            };

            // Cart Click
            const cartBtn = card.querySelector('.add-cart-btn');
            cartBtn.onclick = (e) => {
                e.stopPropagation();
                const prodId = card.dataset.id;
                const prodTitle = card.querySelector('.product-name').innerText;
                if (!currentUser) {
                    window.showLoginRequiredModal({ type: 'cart', data: { id: prodId, title: prodTitle } });
                } else {
                    if (window.addToCart) window.addToCart({ id: prodId, title: prodTitle });
                    else window.showToast(`Added to your bag!`);
                }
            };
        });
    };

    // 6. Load Homepage Featured Products
    const featuredContainer = document.getElementById('featuredProducts');
    if (featuredContainer) {
        const loadFeatured = async () => {
            // Immediately show skeleton placeholders for featured products only
            featuredContainer.innerHTML = Array(3).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-img"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text short"></div>
                        <div class="skeleton-text medium"></div>
                    </div>
                </div>
            `).join('');

            if (window.updateChenariLoaderText) {
                window.updateChenariLoaderText("Curating Premium Collection...");
            }
            try {
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(3));
                const snapshot = await getDocs(q);
                featuredContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    featuredContainer.innerHTML += renderProductCard({ id: doc.id, ...doc.data() });
                });
                attachListeners(featuredContainer);
            } catch (error) {
                console.error("Error loading featured:", error);
            } finally {
                if (window.hideChenariLoader) {
                    window.hideChenariLoader();
                }
            }
        };
        loadFeatured();
    }

    // 7. Load Product Listing Page
    const productsListContainer = document.getElementById('productsList');
    if (productsListContainer) {
        let allProducts = [];
        const loadAll = async () => {
            // Immediately show skeleton placeholders for products only, keeping UI visible
            productsListContainer.innerHTML = Array(6).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-img"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text short"></div>
                        <div class="skeleton-text medium"></div>
                    </div>
                </div>
            `).join('');

            if (window.updateChenariLoaderText) {
                window.updateChenariLoaderText("Curating Premium Collection...");
            }
            try {
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                allProducts = [];
                snapshot.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
                renderAndFilter();
            } catch (error) {
                console.error("Error loading all:", error);
            } finally {
                if (window.hideChenariLoader) {
                    window.hideChenariLoader();
                }
            }
        };

        const renderAndFilter = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const activeCat = urlParams.get('category') || 'all';
            const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
            const sortSelect = document.getElementById('sortSelect')?.value || 'default';

            let filtered = allProducts.filter(p => {
                const matchesCat = activeCat === 'all' || p.category.toLowerCase() === activeCat.toLowerCase();
                return matchesCat && p.title.toLowerCase().includes(searchTerm);
            });

            if (sortSelect === 'price-low') {
                filtered.sort((a, b) => a.price - b.price);
            } else if (sortSelect === 'price-high') {
                filtered.sort((a, b) => b.price - a.price);
            }

            productsListContainer.innerHTML = filtered.map(p => renderProductCard(p)).join('');
            attachListeners(productsListContainer);
        };

        document.getElementById('searchInput')?.addEventListener('input', renderAndFilter);
        document.getElementById('sortSelect')?.addEventListener('change', renderAndFilter);
        loadAll();
    }

    // 8. Global Search
    const globalSearchInput = document.getElementById('globalSearchInput');
    const searchResults = document.getElementById('searchResults');
    if (globalSearchInput && searchResults) {
        let allProductsCache = [];
        let searchTimeout = null;

        const performSearch = async () => {
            const term = globalSearchInput.value.trim().toLowerCase();
            if (term.length < 2) {
                searchResults.classList.add('hidden');
                return;
            }

            if (allProductsCache.length === 0) {
                const q = query(collection(db, 'products'));
                const snapshot = await getDocs(q);
                allProductsCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            const results = allProductsCache.filter(p => 
                p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
            ).slice(0, 5);

            if (results.length > 0) {
                searchResults.innerHTML = results.map(p => `
                    <a href="product-details.html?id=${p.id}" class="search-result-item">
                        <img src="${p.images?.[0] || 'assets/images/default.png'}" class="search-result-img">
                        <div class="search-result-info">
                            <span class="search-result-title">${p.title}</span>
                            <span class="search-result-price">$${p.price.toLocaleString()}</span>
                        </div>
                    </a>
                `).join('');
                searchResults.classList.remove('hidden');
            } else {
                searchResults.innerHTML = `<div class="search-result-item">No items found for "${term}"</div>`;
                searchResults.classList.remove('hidden');
            }
        };

        globalSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 300);
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    // 9. Global Utility
    if (!window.showToast) {
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
    }
});
