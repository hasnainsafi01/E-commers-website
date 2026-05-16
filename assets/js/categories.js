import { db } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const categoriesGrid = document.getElementById('categoriesGrid');
    const categoryCount = document.getElementById('categoryCount');
    const categoryModal = document.getElementById('categoryModal');
    const categoryForm = document.getElementById('categoryForm');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const closeCategoryModal = document.getElementById('closeCategoryModal');
    const cancelCategory = document.getElementById('cancelCategory');
    const modalTitle = document.getElementById('modalTitle');

    let allCategories = [];

    // 1. Initialize Defaults if Collection is Empty
    const initDefaults = async () => {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        if (querySnapshot.empty) {
            const defaults = [
                { name: 'Watches', icon: 'fas fa-clock', desc: 'Exquisite timepieces from world-renowned horologists.', createdAt: new Date() },
                { name: 'Bags', icon: 'fas fa-shopping-bag', desc: 'Premium leather bags and designer carryalls.', createdAt: new Date() },
                { name: 'Shoes', icon: 'fas fa-shoe-prints', desc: 'Luxury footwear for every occasion.', createdAt: new Date() }
            ];

            for (const cat of defaults) {
                const newDocRef = doc(collection(db, 'categories'));
                await setDoc(newDocRef, cat);
            }
        }
    };

    // 2. Fetch and Listen to Categories
    const fetchCategories = () => {
        const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
        
        onSnapshot(q, (snapshot) => {
            allCategories = [];
            snapshot.forEach((doc) => {
                allCategories.push({ id: doc.id, ...doc.data() });
            });
            renderCategories();
            if (categoryCount) categoryCount.innerText = `${allCategories.length} Categories Defined`;
        });
    };

    // 3. Render Categories
    const renderCategories = () => {
        categoriesGrid.innerHTML = '';
        
        if (allCategories.length === 0) {
            categoriesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">No categories found. Start by adding one.</div>';
            return;
        }

        allCategories.forEach(cat => {
            const card = `
                <div class="category-card" data-id="${cat.id}">
                    <div class="category-icon">
                        <i class="${cat.icon || 'fas fa-tag'}"></i>
                    </div>
                    <div class="category-details">
                        <h3>${cat.name}</h3>
                        <p>${cat.desc || 'No description provided.'}</p>
                    </div>
                    <div class="category-stats">
                        <div class="stat-item">
                            <span class="stat-value">--</span>
                            <span class="stat-label">Products</span>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button class="btn-icon" onclick="openEditModal('${cat.id}')" title="Edit Category">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteCategory('${cat.id}')" title="Delete Category">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            categoriesGrid.insertAdjacentHTML('beforeend', card);
        });
    };

    // 4. Modal Logic
    const openModal = (edit = false, id = null) => {
        if (edit) {
            const cat = allCategories.find(c => c.id === id);
            if (!cat) return;
            modalTitle.innerText = 'Edit Category';
            document.getElementById('categoryId').value = cat.id;
            document.getElementById('catName').value = cat.name;
            document.getElementById('catIcon').value = cat.icon;
            document.getElementById('catDesc').value = cat.desc;
        } else {
            modalTitle.innerText = 'Add Category';
            categoryForm.reset();
            document.getElementById('categoryId').value = '';
        }
        categoryModal.classList.add('active');
    };

    const closeModal = () => {
        categoryModal.classList.remove('active');
        categoryForm.reset();
    };

    addCategoryBtn.onclick = () => openModal();
    closeCategoryModal.onclick = closeModal;
    cancelCategory.onclick = closeModal;

    // 5. Submit Handler (Add/Edit)
    categoryForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('catName').value;
        const icon = document.getElementById('catIcon').value;
        const desc = document.getElementById('catDesc').value;

        const catData = {
            name,
            icon,
            desc,
            updatedAt: new Date()
        };

        try {
            const submitBtn = categoryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            if (id) {
                // Edit
                await updateDoc(doc(db, 'categories', id), catData);
                showToast('Category updated successfully!');
            } else {
                // Add
                catData.createdAt = new Date();
                const newDocRef = doc(collection(db, 'categories'));
                await setDoc(newDocRef, catData);
                showToast('New category added!');
            }

            closeModal();
        } catch (error) {
            console.error("Error saving category:", error);
            showToast('Error saving category.');
        } finally {
            const submitBtn = categoryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Category';
        }
    };

    // 6. Global Handlers (Delete & Edit)
    window.openEditModal = (id) => openModal(true, id);

    window.deleteCategory = async (id) => {
        if (confirm('Are you sure you want to delete this category? Products in this category will not be deleted but may become unclassified.')) {
            try {
                await deleteDoc(doc(db, 'categories', id));
                showToast('Category deleted.');
            } catch (error) {
                console.error("Delete Error:", error);
                showToast('Error deleting category.');
            }
        }
    };

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
    initDefaults().then(() => fetchCategories());
});
