import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const stockTableBody = document.getElementById('stockTableBody');
    const stockCountText = document.getElementById('stockCount');
    const stockSearch = document.getElementById('stockSearch');
    const stockStatusFilter = document.getElementById('stockStatusFilter');

    let allProducts = [];

    // Toast Notification helper
    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('statusToast');
        if (toast) {
            toast.className = `toast ${type === 'error' ? 'error' : ''}`;
            toast.querySelector('span').innerText = message;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 4000);
        }
    };

    // 1. Setup real-time listener on products
    const fetchStock = () => {
        const productsRef = collection(db, 'products');
        onSnapshot(productsRef, (snapshot) => {
            allProducts = [];
            snapshot.forEach(docSnap => {
                allProducts.push({ id: docSnap.id, ...docSnap.data() });
            });
            renderStockTable();
            updateStats();
        }, (error) => {
            console.error("Firestore Stock Error:", error);
            showToast("Failed to fetch products for stock control.", "error");
        });
    };

    // 2. Render Stock Table
    const renderStockTable = () => {
        const query = stockSearch.value.toLowerCase().trim();
        const statusVal = stockStatusFilter.value;

        stockTableBody.innerHTML = '';

        const filtered = allProducts.filter(prod => {
            const title = (prod.title || '').toLowerCase();
            const stock = prod.stock !== undefined ? parseInt(prod.stock) : 0;
            
            const matchesSearch = title.includes(query);

            let matchesStatus = true;
            if (statusVal === 'healthy') matchesStatus = stock >= 10;
            else if (statusVal === 'low') matchesStatus = stock < 10 && stock > 0;
            else if (statusVal === 'out') matchesStatus = stock === 0;

            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            stockTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px; color: var(--admin-text-secondary);">No products found matching stock filters.</td></tr>';
            return;
        }

        filtered.forEach(prod => {
            const stock = prod.stock !== undefined ? parseInt(prod.stock) : 0;
            const imageUrl = (prod.images && prod.images.length > 0) ? prod.images[0] : 'https://via.placeholder.com/50';
            const title = prod.title || 'Unnamed Piece';
            const category = prod.category || 'Uncategorized';
            
            // Stock levels status
            let statusBadge = '';
            if (stock === 0) {
                statusBadge = '<span class="stock-badge stock-low">OUT OF STOCK</span>';
            } else if (stock < 10) {
                statusBadge = '<span class="stock-badge" style="background: #fffbe6; color: #d46b08;">LOW STOCK</span>';
            } else {
                statusBadge = '<span class="stock-badge stock-ok">HEALTHY</span>';
            }

            const row = `
                <tr>
                    <td>
                        <div class="prod-cell">
                            <img src="${imageUrl}" alt="${title}" class="prod-thumb" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random'">
                            <div class="prod-info">
                                <span style="font-weight: 600; display: block;">${title}</span>
                                <span style="font-size: 0.7rem; color: var(--admin-text-secondary);">ID: ${prod.id.substring(0, 8)}...</span>
                            </div>
                        </div>
                    </td>
                    <td>${category}</td>
                    <td style="font-weight: 600;">${stock} pieces</td>
                    <td>10 pieces</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="number" id="quickStock-${prod.id}" value="${stock}" min="0" style="width: 75px; padding: 8px; border: 1px solid var(--admin-border); border-radius: 6px; background: transparent; color: var(--admin-text-primary); text-align: center; font-weight: 600;">
                            <button class="btn-icon" id="btnUpdate-${prod.id}" onclick="updateStock('${prod.id}')" title="Save Stock Level">
                                <i class="fas fa-check" style="color: #27ae60;"></i>
                            </button>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                </tr>
            `;
            stockTableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // 3. Update stock levels stats
    const updateStats = () => {
        if (!stockCountText) return;
        const total = allProducts.length;
        const low = allProducts.filter(p => p.stock < 10 && p.stock > 0).length;
        const out = allProducts.filter(p => p.stock === 0).length;

        stockCountText.innerText = `${total} items cataloged • ${low} low stock • ${out} out of stock`;
    };

    // 4. Update Stock in Firestore
    window.updateStock = async (id) => {
        const inputElem = document.getElementById(`quickStock-${id}`);
        const btnElem = document.getElementById(`btnUpdate-${id}`);
        if (!inputElem || !btnElem) return;

        const newStock = parseInt(inputElem.value);
        if (isNaN(newStock) || newStock < 0) {
            showToast("Please enter a valid stock quantity.", "error");
            return;
        }

        try {
            btnElem.disabled = true;
            btnElem.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const prodRef = doc(db, 'products', id);
            await updateDoc(prodRef, { stock: newStock });

            showToast("Stock level updated successfully!");
        } catch (error) {
            console.error("Stock Update Error:", error);
            showToast("Failed to update stock quantity.", "error");
        } finally {
            btnElem.disabled = false;
            btnElem.innerHTML = '<i class="fas fa-check" style="color: #27ae60;"></i>';
        }
    };

    // Search and filters listeners
    stockSearch.addEventListener('input', renderStockTable);
    stockStatusFilter.addEventListener('change', renderStockTable);

    // Run
    fetchStock();
});
