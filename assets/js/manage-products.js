import { db } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const productTableBody = document.getElementById('productTableBody');
    const searchInput = document.getElementById('adminSearchInput');
    const categoryFilter = document.getElementById('adminCategoryFilter');
    const productsCount = document.getElementById('manageProductsCount');
    
    // Pagination Elements
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const pageNumbersContainer = document.getElementById('pageNumbers');

    // Modal Elements
    const editModal = document.getElementById('editModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const editProductForm = document.getElementById('editProductForm');
    const previewModal = document.getElementById('previewModal');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const previewFullImage = document.getElementById('previewFullImage');

    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1;
    const itemsPerPage = 8;

    // 1. Initial Data Fetch & Category Sync
    const fetchCategories = async () => {
        try {
            const catQuery = query(collection(db, 'categories'), orderBy('name', 'asc'));
            const catSnapshot = await getDocs(catQuery);
            const editCatSelect = document.getElementById('editProdCategory');
            const filterCatSelect = document.getElementById('adminCategoryFilter'); // Corrected ID

            const options = catSnapshot.docs.map(doc => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
            
            if (editCatSelect) editCatSelect.innerHTML = options;
            if (filterCatSelect) {
                filterCatSelect.innerHTML = '<option value="all">All Categories</option>' + options;
            }
        } catch (err) {
            console.error("Cat Sync Error:", err);
        }
    };

    const fetchProducts = async () => {
        try {
            productTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px;">Loading your collection...</td></tr>';
            
            const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            allProducts = [];
            querySnapshot.forEach((doc) => {
                allProducts.push({ id: doc.id, ...doc.data() });
            });

            filteredProducts = [...allProducts];
            updateTable();
            if (productsCount) productsCount.innerText = `${allProducts.length} items cataloged`;

        } catch (error) {
            console.error("Error fetching products:", error);
            productTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--primary-red); padding: 50px;">Error loading products.</td></tr>';
        }
    };

    // 2. Update Table (with Pagination)
    const updateTable = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        renderTable(paginatedProducts);
        renderPagination();
    };

    const renderTable = (products) => {
        productTableBody.innerHTML = '';
        
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px;">No products found matching your criteria.</td></tr>';
            return;
        }

        products.forEach(product => {
            const date = product.createdAt?.toDate ? new Date(product.createdAt.toDate()) : (product.createdAt ? new Date(product.createdAt) : new Date());
            const row = `
                <tr>
                    <td data-label="Product Details">
                        <div class="prod-cell">
                            <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/50'}" alt="${product.title}" class="prod-thumb" onclick="previewImage('${product.images && product.images[0] ? product.images[0] : ''}')" style="cursor: zoom-in;">
                            <div class="prod-info">
                                <span style="font-weight: 600; display: block;">${product.title}</span>
                                <span style="font-size: 0.7rem; color: var(--admin-text-secondary);">ID: ${product.id.substring(0, 8)}...</span>
                            </div>
                        </div>
                    </td>
                    <td data-label="Category">${product.category}</td>
                    <td data-label="Price">PKR ${parseFloat(product.price).toLocaleString()}</td>
                    <td data-label="Stock Status">
                        <span class="stock-badge ${product.stock < 10 ? 'stock-low' : 'stock-ok'}">
                            ${product.stock} in stock
                        </span>
                    </td>
                    <td data-label="Added Date">${date.toLocaleDateString()}</td>
                    <td data-label="Actions">
                        <div class="action-btns">
                            <button class="btn-icon" title="Edit Product" onclick="openEditModal('${product.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete" title="Delete Product" onclick="handleDelete('${product.id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            productTableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // 3. Pagination Logic
    const renderPagination = () => {
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length);

        paginationInfo.innerText = `Showing ${filteredProducts.length > 0 ? startIndex + 1 : 0} to ${endIndex} of ${filteredProducts.length} pieces`;

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        pageNumbersContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `btn-page ${i === currentPage ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => {
                currentPage = i;
                updateTable();
            };
            pageNumbersContainer.appendChild(btn);
        }
    };

    prevPageBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    };

    nextPageBtn.onclick = () => {
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    };

    // 4. Search and Filter
    const filterProducts = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;

        filteredProducts = allProducts.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm);
            const matchesCategory = category === 'all' || p.category === category;
            return matchesSearch && matchesCategory;
        });

        currentPage = 1;
        updateTable();
    };

    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);

    // 5. Edit Handler
    window.openEditModal = (id) => {
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        document.getElementById('editProdId').value = product.id;
        document.getElementById('editProdTitle').value = product.title;
        document.getElementById('editProdCategory').value = product.category;
        document.getElementById('editProdPrice').value = product.price;
        document.getElementById('editProdStock').value = product.stock;
        document.getElementById('editProdRating').value = product.rating !== undefined ? product.rating : 5.0;
        document.getElementById('editProdDiscount').value = product.discount || 0;
        document.getElementById('editProdDesc').value = product.description;

        editModal.classList.add('active');
    };

    const closeModal = () => {
        editModal.classList.remove('active');
        editProductForm.reset();
    };

    closeEditModal.onclick = closeModal;
    cancelEditBtn.onclick = closeModal;

    editProductForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('editProdId').value;
        const updatedData = {
            title: document.getElementById('editProdTitle').value,
            category: document.getElementById('editProdCategory').value,
            price: parseFloat(document.getElementById('editProdPrice').value),
            stock: parseInt(document.getElementById('editProdStock').value),
            rating: parseFloat(document.getElementById('editProdRating').value) || 5.0,
            discount: parseInt(document.getElementById('editProdDiscount').value) || 0,
            description: document.getElementById('editProdDesc').value,
            updatedAt: new Date()
        };

        try {
            const publishBtn = editProductForm.querySelector('.btn-publish');
            publishBtn.disabled = true;
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            await updateDoc(doc(db, 'products', id), updatedData);
            
            showToast('Product updated successfully!');
            closeModal();
            fetchProducts();
        } catch (error) {
            console.error("Update Error:", error);
            showToast('Error updating product.');
        } finally {
            const publishBtn = editProductForm.querySelector('.btn-publish');
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    };

    // 6. Custom Delete Confirmation Modal Handler
    const deleteModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    let productToDeleteId = null;

    window.handleDelete = (id) => {
        productToDeleteId = id;
        if (deleteModal) {
            deleteModal.classList.add('active');
        }
    };

    const closeDeleteModal = () => {
        if (deleteModal) {
            deleteModal.classList.remove('active');
        }
        productToDeleteId = null;
    };

    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = closeDeleteModal;
    }

    // Close on overlay backdrop click
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                closeDeleteModal();
            }
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async () => {
            if (!productToDeleteId) return;
            
            try {
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

                await deleteDoc(doc(db, 'products', productToDeleteId));
                
                showToast('Product removed from catalog.');
                closeDeleteModal();
                fetchProducts();
            } catch (error) {
                console.error("Delete Error:", error);
                showToast('Error deleting product.');
            } finally {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            }
        };
    }

    // 7. Image Preview
    window.previewImage = (src) => {
        if (!src) return;
        previewFullImage.src = src;
        previewModal.classList.add('active');
    };

    closePreviewModal.onclick = () => {
        previewModal.classList.remove('active');
    };

    // 8. Utility
    function showToast(msg) {
        const toast = document.getElementById('statusToast');
        if (toast) {
            toast.querySelector('span').innerText = msg;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 4000);
        }
    }

    fetchCategories().then(() => fetchProducts());
});
