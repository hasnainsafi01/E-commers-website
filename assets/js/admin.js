import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Cloudinary Configuration
const CLOUD_NAME = "dqsvcn94y";
const UPLOAD_PRESET = "E-commerce";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

document.addEventListener('DOMContentLoaded', () => {
    // Custom Toast Notification System
    const showToast = (message, type = 'success') => {
        let container = document.getElementById('adminToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.style.position = 'fixed';
            container.style.bottom = '30px';
            container.style.right = '30px';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.style.background = type === 'error' ? 'rgba(255, 59, 48, 0.95)' : 'rgba(26, 26, 26, 0.95)';
        toast.style.color = '#fff';
        toast.style.padding = '15px 30px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.fontSize = '0.85rem';
        toast.style.fontWeight = '600';
        toast.style.letterSpacing = '1px';
        toast.style.textTransform = 'uppercase';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        const iconClass = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
        toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
        
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 50);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    };

    // State Variables
    let currentAdminDoc = null;
    let currentAdminAuth = null;
    let chartInstance = null;

    // 1. Auth & Admin Profile Sync
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentAdminAuth = user;

        // Setup real-time listener for the Admin User's details in Firestore
        const adminRef = doc(db, 'users', user.uid);
        onSnapshot(adminRef, (adminSnap) => {
            if (adminSnap.exists()) {
                currentAdminDoc = adminSnap.data();
                const name = currentAdminDoc.name || currentAdminDoc.displayName || user.displayName || 'Admin User';
                const role = currentAdminDoc.role || 'Chief Curator';
                const photoURL = currentAdminDoc.photoURL || user.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80';

                const nameElem = document.getElementById('adminName');
                const roleElem = document.getElementById('adminRole');
                const avatarImg = document.getElementById('adminAvatarImg');

                if (nameElem) nameElem.innerText = name;
                if (roleElem) roleElem.innerText = role;
                if (avatarImg) avatarImg.src = photoURL;
            }
        });

        // Initialize Real-Time Dashboard Queries
        initRealtimeDashboard();
    });

    // 2. Avatar Selection and Cloudinary Upload
    const avatarInput = document.getElementById('adminAvatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Simple File Type Validation
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showToast('Invalid file format. Please upload JPG, PNG, or WEBP.', 'error');
                return;
            }

            try {
                showToast('Uploading profile image...');

                // Upload to Cloudinary
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', UPLOAD_PRESET);
                formData.append('folder', 'E-commerce/admin');

                const response = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Cloudinary Upload Failed');
                const data = await response.json();
                const secureURL = data.secure_url;

                // Save URL in Firestore
                if (currentAdminAuth) {
                    const adminRef = doc(db, 'users', currentAdminAuth.uid);
                    await setDoc(adminRef, {
                        photoURL: secureURL
                    }, { merge: true });

                    showToast('Profile image updated successfully!');
                }
            } catch (error) {
                console.error("Cloudinary upload issue:", error);
                showToast('Upload failed. Please try again.', 'error');
            }
        });
    }

    // 3. Real-Time Dashboard Pipeline
    const initRealtimeDashboard = () => {
        // A. Real-Time Stats (Revenue & Orders & Members)
        const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        onSnapshot(ordersQuery, (ordersSnap) => {
            let totalRevenue = 0;
            const orders = [];

            ordersSnap.forEach(docSnap => {
                const orderData = docSnap.data();
                orders.push({ id: docSnap.id, ...orderData });
                totalRevenue += orderData.total || 0;
            });

            // Update Revenue Card (Index 0)
            updateStatUI(0, `PKR ${totalRevenue.toLocaleString()}`, 'Total Revenue');
            // Update Active Orders Card (Index 1)
            updateStatUI(1, ordersSnap.size, 'Active Orders');

            // Render Trends Line Chart
            renderTrendsChart(orders);

            // Populate Recent Transactions Table (Limit to 5)
            populateRecentOrders(orders.slice(0, 5));
        });

        // B. Real-Time Products Listener
        const productsQuery = collection(db, 'products');
        onSnapshot(productsQuery, (productsSnap) => {
            const products = [];
            productsSnap.forEach(docSnap => {
                products.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Update Products Card (Index 2)
            updateStatUI(2, productsSnap.size, 'Cataloged Pieces');

            // Populate Trending Section with Real Top Pieces sorted by sales volume (sales impact)
            const trending = [...products].sort((a, b) => (b.soldCount || b.sold || 0) - (a.soldCount || a.sold || 0));
            populateTrendingProducts(trending.slice(0, 3));

            // Populate Low Stock Alerts dynamically
            populateLowStockAlerts(products);
        });

        // C. Real-Time Users/Members Listener
        const usersQuery = collection(db, 'users');
        onSnapshot(usersQuery, (usersSnap) => {
            // Update Exclusive Members Card (Index 3)
            updateStatUI(3, usersSnap.size, 'Exclusive Members');
        });
    };

    // UI Helper Methods
    const updateStatUI = (index, value, label) => {
        const cards = document.querySelectorAll('.stat-card');
        if (cards[index]) {
            const valElem = cards[index].querySelector('.value');
            const lblElem = cards[index].querySelector('.label');
            if (valElem) valElem.innerText = value;
            if (lblElem) lblElem.innerText = label;
        }
    };

    const populateRecentOrders = (recentOrders) => {
        const recentOrdersTable = document.getElementById('recentOrdersBody');
        if (!recentOrdersTable) return;

        if (recentOrders.length === 0) {
            recentOrdersTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 25px; color: var(--admin-text-secondary);">No recent transactions.</td></tr>';
            return;
        }

        recentOrdersTable.innerHTML = '';
        recentOrders.forEach(order => {
            const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
            recentOrdersTable.innerHTML += `
                <tr>
                    <td>
                        <div class="client-cell" style="display: flex; align-items: center; gap: 12px;">
                            <div class="client-avatar" style="width: 35px; height: 35px; background-color: var(--admin-sidebar-bg); display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: var(--admin-text-primary);">
                                ${order.customerName?.charAt(0).toUpperCase() || 'G'}
                            </div>
                            <span style="font-weight: 500;">${order.customerName || 'Guest Client'}</span>
                        </div>
                    </td>
                    <td>${order.items ? order.items.length : 0} Items</td>
                    <td>${date}</td>
                    <td style="font-weight: 600; color: var(--admin-text-primary);">PKR ${order.total?.toLocaleString()}</td>
                    <td>
                        <span class="status-badge status-${order.status?.toLowerCase() || 'pending'}">
                            ${order.status || 'Pending'}
                        </span>
                    </td>
                </tr>
            `;
        });
    };

    const populateTrendingProducts = (trendingProducts) => {
        const trendingList = document.getElementById('trendingProductsList');
        if (!trendingList) return;

        if (trendingProducts.length === 0) {
            trendingList.innerHTML = '<li style="color: var(--admin-text-secondary); font-size: 0.85rem; padding: 25px 0; text-align: center;">No catalog items.</li>';
            return;
        }

        trendingList.innerHTML = '';
        trendingProducts.forEach(prod => {
            const imageUrl = (prod.images && prod.images.length > 0) ? prod.images[0] : 'https://ui-avatars.com/api/?name=Piece';
            const price = prod.price ? `PKR ${prod.price.toLocaleString()}` : 'PKR 0';
            trendingList.innerHTML += `
                <li class="trending-item">
                    <img src="${imageUrl}" alt="${prod.title || 'Product'}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(prod.title || 'Product')}&background=random'">
                    <div class="info">
                        <h3 style="font-weight: 600;">${prod.title || 'Piece'}</h3>
                        <p>${price} &bull; ${prod.soldCount || prod.sold || 0} sold</p>
                    </div>
                </li>
            `;
        });
    };

    const populateLowStockAlerts = (products) => {
        const alertsList = document.getElementById('lowStockAlertsList');
        if (!alertsList) return;

        // Filter products with stock < 10 (or customize limit)
        const lowStockItems = products.filter(p => (p.stock !== undefined ? p.stock : 0) < 10);

        if (lowStockItems.length === 0) {
            alertsList.innerHTML = `
                <li style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--admin-text-secondary); text-align: center; padding: 40px 0;">
                    <i class="fas fa-check-circle" style="color: #27ae60; font-size: 2.5rem; margin-bottom: 15px; opacity: 0.8;"></i>
                    <span style="font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">All Stocks Healthy</span>
                </li>
            `;
            return;
        }

        alertsList.innerHTML = '';
        lowStockItems.forEach(prod => {
            const imageUrl = (prod.images && prod.images.length > 0) ? prod.images[0] : 'https://ui-avatars.com/api/?name=Piece';
            const stockText = prod.stock === 0 ? 'Out of Stock' : `${prod.stock} left in stock`;
            const stockColor = prod.stock === 0 ? '#ff3b30' : '#ebac14';
            alertsList.innerHTML += `
                <li class="trending-item" style="border-bottom: 1px solid var(--admin-border); padding-bottom: 15px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                    <img src="${imageUrl}" alt="${prod.title || 'Product'}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(prod.title || 'Product')}&background=random'" style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px;">
                    <div class="info" style="flex: 1;">
                        <h3 style="font-weight: 600; margin: 0 0 5px 0; font-size: 0.9rem;">${prod.title || 'Piece'}</h3>
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${stockColor}; text-transform: uppercase; letter-spacing: 0.5px;">${stockText}</span>
                    </div>
                </li>
            `;
        });
    };

    const renderTrendsChart = (orders) => {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = {};

        // Generate last 6 months list dynamically
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            monthlyData[key] = 0;
        }

        // Sum order totals in correct monthly buckets
        orders.forEach(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : null;
            if (orderDate) {
                const key = `${monthNames[orderDate.getMonth()]} ${orderDate.getFullYear()}`;
                if (monthlyData[key] !== undefined) {
                    monthlyData[key] += order.total || 0;
                }
            }
        });

        const labels = Object.keys(monthlyData);
        const dataValues = Object.values(monthlyData);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const lineColor = isDark ? '#40a9ff' : '#007bff';

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Revenue',
                    data: dataValues,
                    borderColor: lineColor,
                    backgroundColor: 'rgba(0, 123, 255, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: lineColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: isDark ? '#888' : '#666', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { 
                            color: isDark ? '#888' : '#666',
                            font: { family: 'Inter', size: 10 },
                            callback: value => 'PKR ' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    };

    // 4. Mobile Menu Handler
    const mobileToggle = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.admin-sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.onclick = () => sidebar.classList.toggle('active');
    }
});
