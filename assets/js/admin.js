import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dashboard State
    const statsContainer = document.querySelector('.stats-grid');
    const recentOrdersTable = document.querySelector('.admin-table tbody');

    // 2. Fetch Real Statistics
    const loadDashboardData = async () => {
        try {
            // Fetch Products
            const productsSnap = await getDocs(collection(db, 'products'));
            const totalProducts = productsSnap.size;

            // Fetch Orders
            const ordersSnap = await getDocs(collection(db, 'orders'));
            const totalOrders = ordersSnap.size;
            let totalRevenue = 0;
            ordersSnap.forEach(doc => {
                totalRevenue += doc.data().total || 0;
            });

            // Fetch Users
            const usersSnap = await getDocs(collection(db, 'users'));
            const totalUsers = usersSnap.size;

            // Update UI
            updateStatUI(0, `€${totalRevenue.toLocaleString()}`, 'Total Revenue');
            updateStatUI(1, totalOrders, 'Active Orders');
            updateStatUI(2, totalProducts, 'Cataloged Pieces');
            updateStatUI(3, totalUsers, 'Exclusive Members');

            // Load Recent Orders
            loadRecentOrders();
        } catch (error) {
            console.error("Dashboard Load Error:", error);
        }
    };

    const updateStatUI = (index, value, label) => {
        const cards = document.querySelectorAll('.stat-card');
        if (cards[index]) {
            cards[index].querySelector('.value').innerText = value;
            cards[index].querySelector('.label').innerText = label;
        }
    };

    const loadRecentOrders = async () => {
        if (!recentOrdersTable) return;
        try {
            const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                recentOrdersTable.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No recent transactions.</td></tr>';
                return;
            }

            recentOrdersTable.innerHTML = '';
            snapshot.forEach(doc => {
                const order = doc.data();
                const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
                recentOrdersTable.innerHTML += `
                    <tr>
                        <td>
                            <div class="customer-cell">
                                <div class="avatar-small">${order.customerName?.charAt(0) || 'U'}</div>
                                ${order.customerName || 'Guest'}
                            </div>
                        </td>
                        <td>${order.items ? order.items.length : 0} Items</td>
                        <td>${date}</td>
                        <td>$${order.total?.toLocaleString()}</td>
                        <td><span class="status-badge status-${order.status?.toLowerCase() || 'pending'}">${order.status || 'Pending'}</span></td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    };

    loadDashboardData();

    // 3. Mobile Sidebar
    const mobileToggle = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.admin-sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.onclick = () => sidebar.classList.toggle('active');
    }
});
