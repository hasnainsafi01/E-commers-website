import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, updateDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const ordersTableBody = document.getElementById('ordersTableBody');
    const orderCount = document.getElementById('orderCount');
    const orderSearch = document.getElementById('orderSearch');
    const statusFilter = document.getElementById('statusFilter');
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    
    // Modal Elements
    const detailOrderId = document.getElementById('detailOrderId');
    const detailOrderDate = document.getElementById('detailOrderDate');
    const detailItemsList = document.getElementById('detailItemsList');
    const detailCustomerName = document.getElementById('detailCustomerName');
    const detailCustomerAddress = document.getElementById('detailCustomerAddress');
    const detailCustomerEmail = document.getElementById('detailCustomerEmail');
    const detailSubtotal = document.getElementById('detailSubtotal');
    const detailShipping = document.getElementById('detailShipping');
    const detailTotal = document.getElementById('detailTotal');
    const updateStatusSelect = document.getElementById('updateStatusSelect');
    const updateStatusBtn = document.getElementById('updateStatusBtn');

    let allOrders = [];
    let currentOrderId = null;

    // 1. Initialize Mock Orders if Collection is Empty
    const initMockOrders = async () => {
        const querySnapshot = await getDocs(collection(db, 'orders'));
        if (querySnapshot.empty) {
            const mocks = [
                {
                    orderId: 'ORD-9021',
                    client: { name: 'Julian De Saint', email: 'julian@example.com', address: '123 Luxury Ave, Suite 500, Paris, France' },
                    date: new Date(),
                    items: [
                        { title: 'Chronos Heritage IV', price: 4200, qty: 1, image: 'assets/images/watch.png' },
                        { title: 'Atelier Suede Tote', price: 1850, qty: 1, image: 'assets/images/bag.png' }
                    ],
                    subtotal: 6050,
                    shipping: 45,
                    total: 6095,
                    status: 'Processing'
                },
                {
                    orderId: 'ORD-9020',
                    client: { name: 'Elena Moretti', email: 'elena@example.com', address: 'Via Montenapoleone 8, Milan, Italy' },
                    date: new Date(Date.now() - 86400000),
                    items: [
                        { title: 'Florence Leather Tote', price: 2850, qty: 1, image: 'assets/images/bag.png' }
                    ],
                    subtotal: 2850,
                    shipping: 45,
                    total: 2895,
                    status: 'Shipped'
                }
            ];

            for (const order of mocks) {
                const newDocRef = doc(collection(db, 'orders'));
                await setDoc(newDocRef, order);
            }
        }
    };

    // 2. Fetch and Listen to Orders
    const fetchOrders = () => {
        const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
        
        onSnapshot(q, (snapshot) => {
            allOrders = [];
            snapshot.forEach((doc) => {
                allOrders.push({ id: doc.id, ...doc.data() });
            });
            renderOrders();
            if (orderCount) orderCount.innerText = `${allOrders.length} orders in record`;
        });
    };

    // 3. Render Orders Table
    const renderOrders = () => {
        const searchTerm = orderSearch.value.toLowerCase();
        const filterStatus = statusFilter.value;

        ordersTableBody.innerHTML = '';
        
        const filtered = allOrders.filter(o => {
            const matchesSearch = o.orderId.toLowerCase().includes(searchTerm) || o.client.name.toLowerCase().includes(searchTerm);
            const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px;">No orders found.</td></tr>';
            return;
        }

        filtered.forEach(order => {
            const date = order.date?.toDate ? order.date.toDate() : new Date(order.date);
            const statusClass = `status-${order.status.toLowerCase()}`;
            
            const row = `
                <tr>
                    <td><strong>${order.orderId}</strong></td>
                    <td>
                        <div class="client-cell">
                            <div class="client-avatar">${order.client.name.split(' ').map(n => n[0]).join('')}</div>
                            ${order.client.name}
                        </div>
                    </td>
                    <td>${date.toLocaleDateString()}</td>
                    <td>€${order.total.toLocaleString()}</td>
                    <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                    <td>
                        <button class="btn-icon" onclick="viewOrderDetails('${order.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            ordersTableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // 4. Order Details Logic
    window.viewOrderDetails = (id) => {
        const order = allOrders.find(o => o.id === id);
        if (!order) return;
        
        currentOrderId = id;
        const date = order.date?.toDate ? order.date.toDate() : new Date(order.date);
        
        detailOrderId.innerText = `Order #${order.orderId}`;
        detailOrderDate.innerText = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        detailCustomerName.innerText = order.client.name;
        detailCustomerAddress.innerHTML = `
            ${order.client.fullAddressString || order.client.address || 'Address not provided'}<br>
            <strong>Phone:</strong> ${order.client.phone || 'N/A'}<br>
            <strong>Notes:</strong> ${order.client.notes || 'None'}
        `;
        detailCustomerEmail.innerText = order.client.email;
        detailSubtotal.innerText = `€${order.subtotal.toLocaleString()}`;
        detailShipping.innerText = `€${order.shipping.toLocaleString()}`;
        detailTotal.innerText = `€${order.total.toLocaleString()}`;
        updateStatusSelect.value = order.status;

        detailItemsList.innerHTML = '';
        order.items.forEach(item => {
            const itemHTML = `
                <div class="order-item-row">
                    <img src="${item.image}" alt="${item.title}">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 1rem;">${item.title}</h4>
                        <span style="font-size: 0.8rem; color: var(--admin-text-secondary);">Qty: ${item.qty}</span>
                    </div>
                    <div style="font-weight: 600;">€${(item.price * item.qty).toLocaleString()}</div>
                </div>
            `;
            detailItemsList.insertAdjacentHTML('beforeend', itemHTML);
        });

        orderDetailsModal.classList.add('active');
    };

    const closeModal = () => {
        orderDetailsModal.classList.remove('active');
        currentOrderId = null;
    };

    closeDetailsModal.onclick = closeModal;

    // 5. Update Status
    updateStatusBtn.onclick = async () => {
        if (!currentOrderId) return;
        
        const newStatus = updateStatusSelect.value;
        try {
            updateStatusBtn.disabled = true;
            updateStatusBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            await updateDoc(doc(db, 'orders', currentOrderId), { status: newStatus });
            
            showToast('Order status updated!');
            closeModal();
        } catch (error) {
            console.error("Update Error:", error);
            showToast('Error updating status.');
        } finally {
            updateStatusBtn.disabled = false;
            updateStatusBtn.innerHTML = 'Update Order';
        }
    };

    // 6. Search & Filter Listeners
    orderSearch.oninput = renderOrders;
    statusFilter.onchange = renderOrders;

    // 7. Utility
    function showToast(msg) {
        const toast = document.getElementById('statusToast');
        if (toast) {
            toast.querySelector('span').innerText = msg;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 4000);
        }
    }

    // Execution
    initMockOrders().then(() => fetchOrders());
});
