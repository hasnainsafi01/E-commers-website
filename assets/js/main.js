import { db, auth, googleProvider } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { fetchPersonalizedRecommendations, renderRecommendationsToContainer } from './recommendations.js';

// Clean URL routing redirect for admin routes
const pathname = window.location.pathname.toLowerCase();
if (pathname.endsWith('/admin') || pathname.endsWith('/admin/')) {
    window.location.href = 'admin-login.html';
} else if (pathname.includes('/admin-dashboard') || pathname.includes('/admin/dashboard')) {
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

    // Shared Product Search Cache & Helpers
    let allProductsCache = [];
    const ensureCache = async () => {
        if (allProductsCache.length === 0) {
            const snapshot = await getDocs(collection(db, 'products'));
            allProductsCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    };
    const getCategoryIcon = (cat) => {
        const icons = { watches: 'fa-clock', bags: 'fa-shopping-bag', shoes: 'fa-shoe-prints', jewelry: 'fa-gem', accessories: 'fa-glasses', electronics: 'fa-mobile-alt', clothing: 'fa-tshirt' };
        return icons[cat?.toLowerCase()] || 'fa-tag';
    };
    const highlightMatch = (text, term) => {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background: rgba(66,133,244,0.15); color: var(--primary-blue); border-radius: 2px; padding: 0 2px; font-weight: 700;">$1</mark>');
    };

    // Welcome Popup Implementation (Declared at the top to prevent temporal dead zone ReferenceErrors)
    const showWelcomePopup = (userName, isFirstVisit) => {
        const greeting = isFirstVisit 
            ? `Welcome to MyMart, ${userName}`
            : `Welcome Back to MyMart, ${userName}`;

        const popupHTML = `
            <div id="mymartWelcomeOverlay" style="
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
                    <!-- MyMart Premium Logo with Custom Letter Coloring -->
                    <div style="font-size: 2.6rem; font-weight: 700; letter-spacing: 6px; display: inline-flex; margin-bottom: 25px; font-family: 'Playfair Display', serif;">
                        <span style="color: #4285F4;">M</span><span style="color: #ea4335; margin-left: 2px;">y</span><span style="color: #34a853; margin-left: 2px;">M</span><span style="color: #fbbc05; margin-left: 2px;">a</span><span style="color: #ff5a5f; margin-left: 2px;">r</span><span style="color: #1b5e20; margin-left: 2px;">t</span>
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
                [data-theme="dark"] #mymartWelcomeOverlay .welcome-card {
                    background: rgba(18, 18, 18, 0.85) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4) !important;
                }
                [data-theme="dark"] #mymartWelcomeOverlay h2 {
                    color: #fff !important;
                }
                [data-theme="dark"] #mymartWelcomeOverlay p {
                    color: #aaa !important;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);
        const overlay = document.getElementById('mymartWelcomeOverlay');
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
        if (user) {
            // A user successfully authenticated! Clear the admin logout conflict flags
            sessionStorage.removeItem('mymart_admin_just_logged_out');
            sessionStorage.removeItem('mymart_logged_in_admin');

            // Failsafe check: if user is admin, hide loader and let navbar-auth handle redirect
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    if (window.hideMyMartLoader) {
                        window.hideMyMartLoader();
                    }
                    window.location.href = 'admin.html';
                    return;
                }
            } catch (err) {
                console.warn("Main auth state check failed to fetch role:", err);
            }
        }

        currentUser = user;
        if (window.updateMyMartLoaderText) {
            window.updateMyMartLoaderText("Authenticating Account...");
        }

        // If admin just logged out, suppress all auth-side effects and hide loader only
        if (sessionStorage.getItem('mymart_admin_just_logged_out') === 'true') {
            if (window.hideMyMartLoader) window.hideMyMartLoader();
            return;
        }

        // Live sync mobile drawer auth interface
        if (window.updateDrawerAuthUI) {
            window.updateDrawerAuthUI(user);
        }

        if (user) {
            // Check for pending action in localStorage
            const pending = localStorage.getItem('mymart_pending_action');
            if (pending) {
                localStorage.removeItem('mymart_pending_action');
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
            const sessionKey = `mymart_greeted_${user.uid}`;
            if (sessionStorage.getItem(sessionKey)) {
                console.log("User already greeted this session - Greet Blocked. UID:", user.uid);
                if (window.hideMyMartLoader) {
                    window.hideMyMartLoader();
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
                if (window.hideMyMartLoader) {
                    window.hideMyMartLoader();
                }
            }
        } else {
            console.log("Auth State Changed: Guest user (No authenticated session).");
            if (window.hideMyMartLoader) {
                window.hideMyMartLoader();
            }
            
            // Trigger login modal if requested by a redirect
            if (sessionStorage.getItem('mymart_trigger_login_modal') === 'true') {
                sessionStorage.removeItem('mymart_trigger_login_modal');
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
                            <span style="color:var(--primary-blue);">M</span><span style="color:var(--primary-red);">y</span><span style="color:var(--primary-green);">M</span><span style="color:var(--primary-orange);">a</span><span style="color:var(--light-red);">r</span><span style="color:var(--dark-green);">t</span>
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
                                <li><a href="cart.html" class="auth-guarded"><i class="fas fa-shopping-cart"></i> Cart</a></li>
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
                    <li><a href="cart.html" class="auth-guarded"><i class="fas fa-shopping-basket"></i> View Cart</a></li>
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
                        <h2 class="serif">Join the MyMart Circle</h2>
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
            localStorage.setItem('mymart_pending_action', JSON.stringify(action));
            closeModal();
            setTimeout(() => window.location.href = 'login.html', 300);
        };

        modal.querySelector('#modalSignupBtn').onclick = () => {
            localStorage.setItem('mymart_pending_action', JSON.stringify(action));
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
            else window.showToast(`Added ${data.title} to your cart!`);
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
        
        // Stock Status Setup
        const stock = prod.stock !== undefined ? parseInt(prod.stock) : 0;
        const isOutOfStock = stock === 0;
        let stockBadgeHTML = '';
        let cardStyle = isOutOfStock ? 'filter: grayscale(1); opacity: 0.75;' : '';
        let cartBtnHTML = isOutOfStock 
            ? `<button class="add-cart-btn" disabled style="background: var(--nav-border); cursor: not-allowed; opacity: 0.5;" title="Out of Stock"><i class="fas fa-lock"></i></button>`
            : `<button class="add-cart-btn" title="Add to Cart"><i class="fas fa-plus"></i></button>`;

        if (isOutOfStock) {
            stockBadgeHTML = `<span class="stock-display out-of-stock" style="color: var(--primary-red); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 5px;"><i class="fas fa-exclamation-triangle"></i> Out of Stock</span>`;
        } else if (stock <= 3) {
            stockBadgeHTML = `<span class="stock-display stock-low" style="color: #d97706; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 5px;"><i class="fas fa-hourglass-half"></i> Only ${stock} left</span>`;
        } else {
            stockBadgeHTML = `<span class="stock-display stock-ok" style="color: #666; font-size: 0.72rem; font-weight: 600; display: block; margin-bottom: 5px;">Stock: ${stock} available</span>`;
        }

        // Manual Star Rating Setup
        const rating = prod.rating !== undefined ? parseFloat(prod.rating) : 5.0;
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                starsHTML += `<i class="fas fa-star" style="color: #ebac14; margin-right: 2px;"></i>`;
            } else if (i - 0.5 <= rating) {
                starsHTML += `<i class="fas fa-star-half-alt" style="color: #ebac14; margin-right: 2px;"></i>`;
            } else {
                starsHTML += `<i class="far fa-star" style="color: var(--nav-border); margin-right: 2px;"></i>`;
            }
        }

        return `
            <div class="product-card" data-id="${prod.id}" style="animation: fadeInUp 0.5s ease backwards; ${cardStyle}">
                <div class="product-image">
                    ${discountTag}
                    <button class="fav-btn" title="Add to Wishlist"><i class="far fa-heart"></i></button>
                    <img src="${img}" alt="${prod.title}">
                </div>
                <div class="product-info">
                    ${stockBadgeHTML}
                    <span class="product-category">${prod.category}</span>
                    <h3 class="product-name">${prod.title}</h3>
                    <div class="product-rating" style="display: flex; margin-bottom: 10px;">
                        ${starsHTML}
                    </div>
                    <div class="product-footer">
                        <div class="product-price">
                            <span class="current-price">PKR ${prod.price.toLocaleString()}</span>
                        </div>
                        ${cartBtnHTML}
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
                    else window.showToast(`Added to your cart!`);
                }
            };
        });
    };

    window.renderMyMartProductCard = renderProductCard;
    window.attachMyMartProductListeners = attachListeners;

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

            if (window.updateMyMartLoaderText) {
                window.updateMyMartLoaderText("Curating Premium Collection...");
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
                if (window.hideMyMartLoader) {
                    window.hideMyMartLoader();
                }
            }
        };
        const loadPersonalized = async () => {
            const container = document.getElementById('personalizedRecommendations');
            const section = document.getElementById('personalizedRecommendationsSection');
            if (!container || !section) return;

            try {
                const products = await fetchPersonalizedRecommendations(4);
                if (products && products.length > 0) {
                    section.style.display = 'block';
                    renderRecommendationsToContainer(products, container);
                }
            } catch (error) {
                console.error("Error loading personalized recommendations:", error);
            }
        };

        loadFeatured();
        loadPersonalized();
    }

    // 7. Load Product Listing Page — Full Filter & Sort Engine
    const productsListContainer = document.getElementById('productsList');
    if (productsListContainer) {
        let allProducts = [];
        let isListView = false;

        const loadAll = async () => {
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

            if (window.updateMyMartLoaderText) window.updateMyMartLoaderText("Curating Collection...");
            try {
                const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                allProducts = [];
                snapshot.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
                
                // Restore state from URL
                syncFiltersFromURL();
                renderAndFilter();
            } catch (error) {
                console.error("Error loading products:", error);
            } finally {
                if (window.hideMyMartLoader) window.hideMyMartLoader();
            }
        };

        const syncFiltersFromURL = () => {
            const p = new URLSearchParams(window.location.search);
            
            const catFilter = document.getElementById('categoryFilter');
            const catFromURL = p.get('category');
            if (catFilter && catFromURL) catFilter.value = catFromURL.toLowerCase();
            
            const searchInput = document.getElementById('searchInput');
            const searchFromURL = p.get('search');
            if (searchInput && searchFromURL) searchInput.value = searchFromURL;
            
            const sortSel = document.getElementById('sortSelect');
            const sortFromURL = p.get('sort');
            if (sortSel && sortFromURL) sortSel.value = sortFromURL;

            const priceMin = document.getElementById('priceMin');
            const priceMax = document.getElementById('priceMax');
            if (priceMin && p.get('minPrice')) priceMin.value = p.get('minPrice');
            if (priceMax && p.get('maxPrice')) priceMax.value = p.get('maxPrice');

            const ratingFilter = document.getElementById('ratingFilter');
            if (ratingFilter && p.get('rating')) ratingFilter.value = p.get('rating');

            const inStockOnly = document.getElementById('inStockOnly');
            if (inStockOnly && p.get('inStock') === 'true') inStockOnly.checked = true;
        };

        const saveFiltersToURL = () => {
            const catFilter = document.getElementById('categoryFilter')?.value || 'all';
            const searchTerm = document.getElementById('searchInput')?.value || '';
            const sortVal = document.getElementById('sortSelect')?.value || 'default';
            const minPrice = document.getElementById('priceMin')?.value || '';
            const maxPrice = document.getElementById('priceMax')?.value || '';
            const rating = document.getElementById('ratingFilter')?.value || '0';
            const inStock = document.getElementById('inStockOnly')?.checked || false;

            const params = new URLSearchParams();
            if (catFilter !== 'all') params.set('category', catFilter);
            if (searchTerm) params.set('search', searchTerm);
            if (sortVal !== 'default') params.set('sort', sortVal);
            if (minPrice) params.set('minPrice', minPrice);
            if (maxPrice) params.set('maxPrice', maxPrice);
            if (rating !== '0') params.set('rating', rating);
            if (inStock) params.set('inStock', 'true');

            const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
            history.replaceState(null, '', newURL);
        };

        const renderActiveChips = (filters) => {
            const chips = document.getElementById('activeFilterChips');
            const clearBtn = document.getElementById('clearFiltersBtn');
            if (!chips) return;

            chips.innerHTML = '';
            let hasActive = false;

            const addChip = (label, clearFn) => {
                hasActive = true;
                const chip = document.createElement('span');
                chip.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:3px 10px;background:rgba(66,133,244,0.1);color:var(--primary-blue);border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid rgba(66,133,244,0.25);';
                chip.innerHTML = `${label} <i class="fas fa-times" style="font-size:0.6rem;"></i>`;
                chip.onclick = () => { clearFn(); renderAndFilter(); };
                chips.appendChild(chip);
            };

            if (filters.cat && filters.cat !== 'all') addChip(`📂 ${filters.cat}`, () => { document.getElementById('categoryFilter').value = 'all'; });
            if (filters.search) addChip(`🔍 "${filters.search}"`, () => { document.getElementById('searchInput').value = ''; });
            if (filters.minPrice) addChip(`Min PKR ${parseInt(filters.minPrice).toLocaleString()}`, () => { document.getElementById('priceMin').value = ''; });
            if (filters.maxPrice) addChip(`Max PKR ${parseInt(filters.maxPrice).toLocaleString()}`, () => { document.getElementById('priceMax').value = ''; });
            if (filters.rating && filters.rating !== '0') addChip(`${filters.rating}★ & above`, () => { document.getElementById('ratingFilter').value = '0'; });
            if (filters.inStock) addChip('In Stock Only', () => { document.getElementById('inStockOnly').checked = false; });

            if (clearBtn) clearBtn.style.display = hasActive ? 'inline-flex' : 'none';
        };

        const renderAndFilter = () => {
            const catFilter = document.getElementById('categoryFilter')?.value || 'all';
            const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
            const sortVal = document.getElementById('sortSelect')?.value || 'default';
            const minPrice = parseFloat(document.getElementById('priceMin')?.value) || 0;
            const maxPrice = parseFloat(document.getElementById('priceMax')?.value) || Infinity;
            const minRating = parseFloat(document.getElementById('ratingFilter')?.value) || 0;
            const inStockOnly = document.getElementById('inStockOnly')?.checked || false;

            const filters = { cat: catFilter, search: searchTerm, minPrice: minPrice || '', maxPrice: maxPrice === Infinity ? '' : maxPrice, rating: document.getElementById('ratingFilter')?.value || '0', inStock: inStockOnly };
            renderActiveChips(filters);
            saveFiltersToURL();

            let filtered = allProducts.filter(p => {
                const matchesCat = catFilter === 'all' || p.category?.toLowerCase() === catFilter.toLowerCase();
                const matchesSearch = !searchTerm || p.title?.toLowerCase().includes(searchTerm) || p.category?.toLowerCase().includes(searchTerm) || (p.description || '').toLowerCase().includes(searchTerm);
                const matchesMin = !minPrice || p.price >= minPrice;
                const matchesMax = maxPrice === Infinity || p.price <= maxPrice;
                const matchesRating = !minRating || (parseFloat(p.rating) || 0) >= minRating;
                const matchesStock = !inStockOnly || parseInt(p.stock || 0) > 0;
                return matchesCat && matchesSearch && matchesMin && matchesMax && matchesRating && matchesStock;
            });

            // Sorting
            switch (sortVal) {
                case 'price-low':   filtered.sort((a, b) => a.price - b.price); break;
                case 'price-high':  filtered.sort((a, b) => b.price - a.price); break;
                case 'rating':      filtered.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)); break;
                case 'name-az':     filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
                case 'newest':      filtered.sort((a, b) => { const aD = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0); const bD = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0); return bD - aD; }); break;
            }

            // Results count
            const resultsCount = document.getElementById('resultsCount');
            if (resultsCount) resultsCount.innerText = `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`;

            // Empty state
            const noFound = document.getElementById('noProductsFound');
            if (filtered.length === 0) {
                productsListContainer.innerHTML = '';
                if (noFound) noFound.style.display = 'block';
                return;
            }
            if (noFound) noFound.style.display = 'none';

            // List vs Grid view
            if (isListView) {
                productsListContainer.style.gridTemplateColumns = '1fr';
            } else {
                productsListContainer.style.gridTemplateColumns = '';
            }

            productsListContainer.innerHTML = filtered.map((p, i) => renderProductCard(p, i * 50)).join('');
            attachListeners(productsListContainer);
        };

        // View toggle
        document.getElementById('viewGrid')?.addEventListener('click', () => {
            isListView = false;
            document.getElementById('viewGrid').style.background = 'var(--primary-blue)';
            document.getElementById('viewGrid').style.color = 'white';
            document.getElementById('viewList').style.background = 'transparent';
            document.getElementById('viewList').style.color = 'var(--text-color)';
            renderAndFilter();
        });
        document.getElementById('viewList')?.addEventListener('click', () => {
            isListView = true;
            document.getElementById('viewList').style.background = 'var(--primary-blue)';
            document.getElementById('viewList').style.color = 'white';
            document.getElementById('viewGrid').style.background = 'transparent';
            document.getElementById('viewGrid').style.color = 'var(--text-color)';
            renderAndFilter();
        });

        // Clear all filters
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            const els = ['searchInput', 'priceMin', 'priceMax'];
            els.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            const cat = document.getElementById('categoryFilter'); if (cat) cat.value = 'all';
            const sort = document.getElementById('sortSelect'); if (sort) sort.value = 'default';
            const rating = document.getElementById('ratingFilter'); if (rating) rating.value = '0';
            const inStock = document.getElementById('inStockOnly'); if (inStock) inStock.checked = false;
            renderAndFilter();
        });

        // Debounced listeners
        let filterTimeout = null;
        const debouncedFilter = () => { clearTimeout(filterTimeout); filterTimeout = setTimeout(renderAndFilter, 250); };

        document.getElementById('searchInput')?.addEventListener('input', debouncedFilter);
        document.getElementById('categoryFilter')?.addEventListener('change', renderAndFilter);
        document.getElementById('sortSelect')?.addEventListener('change', renderAndFilter);
        document.getElementById('priceMin')?.addEventListener('input', debouncedFilter);
        document.getElementById('priceMax')?.addEventListener('input', debouncedFilter);
        document.getElementById('ratingFilter')?.addEventListener('change', renderAndFilter);
        document.getElementById('inStockOnly')?.addEventListener('change', renderAndFilter);

        loadAll();
    }

    // 8. Global Search — Premium Real-Time Search Engine
    const globalSearchInput = document.getElementById('globalSearchInput');
    const searchResults = document.getElementById('searchResults');
    if (globalSearchInput && searchResults) {
        let searchTimeout = null;
        let selectedIndex = -1;

        const performSearch = async () => {
            const term = globalSearchInput.value.trim().toLowerCase();
            if (term.length < 2) {
                searchResults.classList.add('hidden');
                selectedIndex = -1;
                return;
            }

            try {
                await ensureCache();

                // Score-based multi-field search
                const scored = allProductsCache.map(p => {
                    let score = 0;
                    const title = (p.title || '').toLowerCase();
                    const cat = (p.category || '').toLowerCase();
                    const desc = (p.description || '').toLowerCase();
                    const keywords = (Array.isArray(p.keywords) ? p.keywords.join(' ') : (p.keywords || '')).toLowerCase();

                    if (title === term) score += 10;
                    else if (title.startsWith(term)) score += 7;
                    else if (title.includes(term)) score += 5;

                    if (cat.includes(term)) score += 4;
                    if (keywords.includes(term)) score += 3;
                    if (desc.includes(term)) score += 1;

                    return { ...p, score };
                }).filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);

                if (scored.length > 0) {
                    const stockBadge = (p) => {
                        const s = parseInt(p.stock || 0);
                        if (s === 0) return `<span style="font-size:0.65rem;color:#e74c3c;font-weight:700;margin-left:6px;">Out of Stock</span>`;
                        if (s <= 3) return `<span style="font-size:0.65rem;color:#d97706;font-weight:700;margin-left:6px;">Only ${s} left</span>`;
                        return '';
                    };

                    searchResults.innerHTML = scored.map((p, i) => `
                        <a href="product-details.html?id=${p.id}" class="search-result-item" data-index="${i}" style="display:flex;align-items:center;gap:12px;padding:10px 16px;text-decoration:none;color:inherit;transition:background 0.15s;border-bottom:1px solid rgba(0,0,0,0.04);" onmouseover="this.style.background='rgba(66,133,244,0.06)'" onmouseout="this.style.background='transparent'">
                            <img src="${p.images?.[0] || 'assets/images/default.png'}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid rgba(0,0,0,0.06);">
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                    <span style="font-size:0.88rem;font-weight:600;color:var(--text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${highlightMatch(p.title, term)}</span>
                                    ${stockBadge(p)}
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;margin-top:3px;">
                                    <span style="font-size:0.7rem;background:rgba(66,133,244,0.1);color:var(--primary-blue);padding:2px 7px;border-radius:10px;font-weight:600;"><i class="fas ${getCategoryIcon(p.category)}" style="margin-right:3px;font-size:0.6rem;"></i>${highlightMatch(p.category, term)}</span>
                                    <span style="font-size:0.82rem;font-weight:700;color:var(--text-color);">PKR ${parseFloat(p.price).toLocaleString()}</span>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#ccc;font-size:0.7rem;flex-shrink:0;"></i>
                        </a>
                    `).join('') + `
                        <a href="products.html?search=${encodeURIComponent(term)}" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 16px;font-size:0.78rem;font-weight:700;color:var(--primary-blue);text-decoration:none;border-top:1px solid rgba(0,0,0,0.06);letter-spacing:0.5px;transition:background 0.15s;" onmouseover="this.style.background='rgba(66,133,244,0.04)'" onmouseout="this.style.background='transparent'">
                            <i class="fas fa-search" style="font-size:0.7rem;"></i> View all results for "${term}"
                        </a>
                    `;
                } else {
                    searchResults.innerHTML = `
                        <div style="padding:24px 16px;text-align:center;">
                            <i class="fas fa-search" style="font-size:1.5rem;color:#ccc;display:block;margin-bottom:8px;"></i>
                            <span style="font-size:0.85rem;color:#888;">No results for <strong>"${term}"</strong></span>
                        </div>
                    `;
                }
                searchResults.classList.remove('hidden');
                selectedIndex = -1;

            } catch (err) {
                console.error("Search error:", err);
            }
        };

        globalSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 280);
        });

        // Keyboard navigation
        globalSearchInput.addEventListener('keydown', (e) => {
            const items = searchResults.querySelectorAll('a.search-result-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                items.forEach((item, i) => item.style.background = i === selectedIndex ? 'rgba(66,133,244,0.08)' : 'transparent');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                items.forEach((item, i) => item.style.background = i === selectedIndex ? 'rgba(66,133,244,0.08)' : 'transparent');
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                items[selectedIndex]?.click();
            } else if (e.key === 'Escape') {
                searchResults.classList.add('hidden');
                globalSearchInput.blur();
            }
        });

        // Handle search redirect from products page URL param
        const urlParams = new URLSearchParams(window.location.search);
        const preloadSearch = urlParams.get('search');
        if (preloadSearch) {
            globalSearchInput.value = preloadSearch;
            // Trigger filter on products page if applicable
            const productSearchInput = document.getElementById('searchInput');
            if (productSearchInput) {
                productSearchInput.value = preloadSearch;
                productSearchInput.dispatchEvent(new Event('input'));
            }
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.add('hidden');
                selectedIndex = -1;
            }
        });

        // Clear cache periodically so new products appear in search
        setInterval(() => { allProductsCache = []; }, 5 * 60 * 1000);
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
