import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #888; letter-spacing: 1px; text-transform: uppercase; margin-top: 20px;">Verifying Curator Credentials...</p>
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

// Route Protection Logic
onAuthStateChanged(auth, async (user) => {
    const curtain = document.getElementById('adminSecurityCurtain');
    
    if (!user) {
        // Unauthenticated -> redirect to login immediately
        window.location.href = 'login.html';
        return;
    }

    // Google Sign-In check: Google users must NEVER access the admin panel under any circumstances
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (isGoogleUser) {
        alert("Access Denied: Google authenticated accounts are strictly prohibited from accessing the curator dashboard. Please sign in using your designated email and password credentials.");
        await auth.signOut();
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Fetch real role from Firestore (Bulletproof check)
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.role === 'admin') {
                // Admin authorized -> Fade out security curtain
                if (curtain) {
                    curtain.style.opacity = '0';
                    curtain.style.visibility = 'hidden';
                    setTimeout(() => curtain.remove(), 500);
                }
                return;
            }
        }
        
        // Non-admin or doc not found -> Redirect to home page immediately
        alert("Access Denied: Exclusive Atelier Curators Only.");
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error("Route Guard Security Error:", error);
        window.location.href = 'index.html';
    }
});
