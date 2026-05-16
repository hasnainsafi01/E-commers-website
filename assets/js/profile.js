import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // 1. Fetch Real User Data
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // 2. Update Basic Info
        document.getElementById('userProfileName').innerText = userData.displayName || user.displayName || 'Luxury Connoisseur';
        document.getElementById('userProfileEmail').innerText = user.email;
        document.getElementById('userProfileImage').src = userData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`;

        // 3. Fetch Real Stats
        // Cart Count
        const cartSnap = await getDocs(collection(db, `users/${user.uid}/cart`));
        document.getElementById('cartStatCount').innerText = cartSnap.size;

        // Favorites Count
        const favSnap = await getDocs(collection(db, `users/${user.uid}/favorites`));
        document.getElementById('favStatCount').innerText = favSnap.size;

        // Orders Count
        // Assuming orders are stored in a top-level collection with customerUid
        // For now, if no orders collection exists, it will show 0
        try {
            const ordersSnap = await getDocs(collection(db, 'orders'));
            const userOrders = ordersSnap.docs.filter(doc => doc.data().customerUid === user.uid);
            document.querySelector('.profile-stats .stat-value').innerText = userOrders.length;
        } catch(e) {
            console.log("Orders count fetch skipped or failed.");
        }
    });

    // Logout
    const logoutBtn = document.getElementById('profileLogoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        };
    }
});
