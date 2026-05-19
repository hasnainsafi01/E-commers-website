import { db, auth } from './firebase-config.js';
import { 
    doc, 
    updateDoc, 
    increment, 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    where, 
    getDocs, 
    getDoc,
    limit, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper: Track User Behavior (views, cart adds, wishlists, purchases)
export async function trackUserBehavior(productId, category, actionType) {
    if (!productId) return;
    
    // 1. Locally track view / behavior in localStorage for instant guest personalization
    try {
        const localLogs = JSON.parse(localStorage.getItem('mymart_behavior_logs')) || [];
        localLogs.push({
            productId,
            category,
            actionType,
            timestamp: Date.now()
        });
        // Keep last 50 events
        if (localLogs.length > 50) localLogs.shift();
        localStorage.setItem('mymart_behavior_logs', JSON.stringify(localLogs));
    } catch (e) {
        console.error("Local storage behavior logging error:", e);
    }

    // 2. Incremental Product Views counter in Firestore (Trending indicator)
    if (actionType === 'view') {
        try {
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                viewCount: increment(1)
            });
        } catch (error) {
            console.warn("Could not increment product viewCount (field might not exist yet, auto-creating on next save or non-crucial):", error);
            // If the viewCount field doesn't exist, we can merge-set it on demand
            try {
                const productRef = doc(db, 'products', productId);
                await updateDoc(productRef, { viewCount: 1 });
            } catch (err2) {}
        }
    }

    // 3. Firestore Behavior Logging for logged-in users (AI-ready structured dataset)
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const logRef = collection(db, 'users', currentUser.uid, 'behavior_logs');
            await addDoc(logRef, {
                productId,
                category: category || 'General',
                actionType,
                timestamp: serverTimestamp()
            });
        } catch (err) {
            console.error("Failed to log authenticated user behavior event:", err);
        }
    }
}

// Helper: Add Product to Recently Viewed list
export function addToRecentlyViewed(productId) {
    if (!productId) return;
    try {
        let items = JSON.parse(localStorage.getItem('mymart_recently_viewed')) || [];
        items = items.filter(id => id !== productId); // Remove duplicate
        items.unshift(productId); // Add to beginning
        if (items.length > 8) items.pop(); // Cap at 8 items
        localStorage.setItem('mymart_recently_viewed', JSON.stringify(items));
    } catch (e) {
        console.error("Error setting recently viewed list:", e);
    }
}

// Fetch: Recently Viewed Products
export async function fetchRecentlyViewedProducts() {
    try {
        const ids = JSON.parse(localStorage.getItem('mymart_recently_viewed')) || [];
        if (ids.length === 0) return [];

        const products = [];
        // Firestore doesn't support easy multi-document gets for non-sequential IDs cleanly in a single check without 'in' operator (which caps at 10 items, which is perfect)
        const productsRef = collection(db, 'products');
        for (const id of ids) {
            const docSnap = await getDoc(doc(db, 'products', id));
            if (docSnap.exists()) {
                products.push({ id: docSnap.id, ...docSnap.data() });
            }
        }
        return products;
    } catch (err) {
        console.error("Error fetching recently viewed products:", err);
        return [];
    }
}

// Fetch: Trending Products (highest view count)
export async function fetchTrendingProducts(limitCount = 4) {
    try {
        const q = query(
            collection(db, 'products'), 
            orderBy('viewCount', 'desc'), 
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        // If not enough trending items, fallback to latest
        if (products.length < limitCount) {
            const latestQ = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(limitCount));
            const latestSnap = await getDocs(latestQ);
            const latestProds = [];
            latestSnap.forEach(doc => {
                latestProds.push({ id: doc.id, ...doc.data() });
            });
            // Merge uniquely
            const merged = [...products];
            latestProds.forEach(lp => {
                if (!merged.some(m => m.id === lp.id)) {
                    merged.push(lp);
                }
            });
            return merged.slice(0, limitCount);
        }
        return products;
    } catch (err) {
        console.error("Error fetching trending products:", err);
        // Fallback to basic fetch
        try {
            const q = query(collection(db, 'products'), limit(limitCount));
            const snap = await getDocs(q);
            const prods = [];
            snap.forEach(d => prods.push({ id: d.id, ...d.data() }));
            return prods;
        } catch (e) {
            return [];
        }
    }
}

// Fetch: Related Products (same category, sorted by popularity)
export async function fetchRelatedProducts(productId, category, limitCount = 4) {
    if (!category) return [];
    try {
        const q = query(
            collection(db, 'products'),
            where('category', '==', category),
            limit(limitCount + 1)
        );
        const snapshot = await getDocs(q);
        let products = [];
        snapshot.forEach(doc => {
            if (doc.id !== productId) {
                products.push({ id: doc.id, ...doc.data() });
            }
        });
        
        // Sort by viewCount descending if available
        products.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        products = products.slice(0, limitCount);

        // Fallback if not enough category items
        if (products.length < limitCount) {
            const trending = await fetchTrendingProducts(limitCount);
            trending.forEach(item => {
                if (item.id !== productId && !products.some(p => p.id === item.id)) {
                    products.push(item);
                }
            });
        }
        return products.slice(0, limitCount);
    } catch (err) {
        console.error("Error fetching related products:", err);
        return [];
    }
}

// Fetch: Personalized Recommendations (Category affinity based on recent history)
export async function fetchPersonalizedRecommendations(limitCount = 4) {
    try {
        // 1. Analyze logs to find user's preferred category
        const logs = JSON.parse(localStorage.getItem('mymart_behavior_logs')) || [];
        const categoryCounts = {};
        
        logs.forEach(log => {
            if (log.category) {
                categoryCounts[log.category] = (categoryCounts[log.category] || 0) + (log.actionType === 'view' ? 1 : 3);
            }
        });

        let topCategory = null;
        let maxCount = 0;
        for (const cat in categoryCounts) {
            if (categoryCounts[cat] > maxCount) {
                maxCount = categoryCounts[cat];
                topCategory = cat;
            }
        }

        // 2. Fetch products matching category, otherwise load trending
        if (topCategory) {
            const q = query(
                collection(db, 'products'),
                where('category', '==', topCategory),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            const products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            if (products.length > 0) {
                // If we need more items to fill limits, pad with trending items
                if (products.length < limitCount) {
                    const trending = await fetchTrendingProducts(limitCount);
                    trending.forEach(item => {
                        if (!products.some(p => p.id === item.id)) {
                            products.push(item);
                        }
                    });
                }
                return products.slice(0, limitCount);
            }
        }

        // Default fallback to trending products if no logs or category match
        return await fetchTrendingProducts(limitCount);
    } catch (err) {
        console.error("Error generating personalized recommendations:", err);
        return await fetchTrendingProducts(limitCount);
    }
}

// UI Helper: Render Recommendations to Container
export function renderRecommendationsToContainer(products, containerElement) {
    if (!containerElement) return;
    
    if (!products || products.length === 0) {
        containerElement.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px 0; font-size: 0.9rem;">
                No items matching your style yet. Explore more pieces!
            </div>
        `;
        return;
    }

    if (typeof window.renderMyMartProductCard !== 'function') {
        console.error("window.renderMyMartProductCard is not defined. Ensure main.js is loaded.");
        return;
    }

    containerElement.innerHTML = products.map(prod => window.renderMyMartProductCard(prod)).join('');
    
    if (typeof window.attachMyMartProductListeners === 'function') {
        window.attachMyMartProductListeners(containerElement);
    }
}
