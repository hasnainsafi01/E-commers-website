import { db } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Cloudinary Configuration
const CLOUD_NAME = "dqsvcn94y";
const UPLOAD_PRESET = "ml_default";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

document.addEventListener('DOMContentLoaded', () => {
    const categoriesGrid = document.getElementById('categoriesGrid');
    const categoryCount = document.getElementById('categoryCount');
    const categoryModal = document.getElementById('categoryModal');
    const categoryForm = document.getElementById('categoryForm');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const closeCategoryModal = document.getElementById('closeCategoryModal');
    const cancelCategory = document.getElementById('cancelCategory');
    const modalTitle = document.getElementById('modalTitle');
    
    // Image Upload Elements
    const catImageInput = document.getElementById('catImage');
    const catImageDropzone = document.getElementById('catImageDropzone');
    const catImagePreview = document.getElementById('catImagePreview');
    const catPreviewImg = catImagePreview.querySelector('img');

    let allCategories = [];
    let selectedFile = null;
    let currentImageUrl = '';

    // 1. Initialize Defaults if Collection is Empty
    const initDefaults = async () => {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        if (querySnapshot.empty) {
            const defaults = [
                { name: 'Watches', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80', createdAt: serverTimestamp() },
                { name: 'Bags', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80', createdAt: serverTimestamp() },
                { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80', createdAt: serverTimestamp() }
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
                    <div class="category-img-container">
                        <img src="${cat.image}" alt="${cat.name}">
                    </div>
                    <div class="category-details">
                        <h3>${cat.name}</h3>
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

    // 4. Image Upload Handling
    catImageDropzone.onclick = () => catImageInput.click();
    
    catImageInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                catPreviewImg.src = e.target.result;
                catImagePreview.style.display = 'block';
                catImageDropzone.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Cloudinary upload failed');
        const data = await response.json();
        return data.secure_url;
    };

    // 5. Modal Logic
    const openModal = (edit = false, id = null) => {
        selectedFile = null;
        currentImageUrl = '';
        catImagePreview.style.display = 'none';
        catImageDropzone.style.display = 'flex';

        if (edit) {
            const cat = allCategories.find(c => c.id === id);
            if (!cat) return;
            modalTitle.innerText = 'Edit Category';
            document.getElementById('categoryId').value = cat.id;
            document.getElementById('catName').value = cat.name;
            
            if (cat.image) {
                currentImageUrl = cat.image;
                catPreviewImg.src = cat.image;
                catImagePreview.style.display = 'block';
                catImageDropzone.style.display = 'none';
            }
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

    // 6. Submit Handler
    categoryForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('catName').value;

        try {
            const submitBtn = categoryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            let imageUrl = currentImageUrl;
            if (selectedFile) {
                imageUrl = await uploadToCloudinary(selectedFile);
            }

            if (!imageUrl) {
                showToast('Please select an image.');
                return;
            }

            const catData = {
                name,
                image: imageUrl,
                updatedAt: serverTimestamp()
            };

            if (id) {
                await updateDoc(doc(db, 'categories', id), catData);
                showToast('Category updated!');
            } else {
                catData.createdAt = serverTimestamp();
                const newDocRef = doc(collection(db, 'categories'));
                await setDoc(newDocRef, catData);
                showToast('New category added!');
            }

            closeModal();
        } catch (error) {
            console.error("Save Error:", error);
            showToast('Error saving category.');
        } finally {
            const submitBtn = categoryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Category';
        }
    };

    // 7. Global Handlers
    window.openEditModal = (id) => openModal(true, id);

    window.deleteCategory = async (id) => {
        if (confirm('Are you sure you want to delete this category?')) {
            try {
                await deleteDoc(doc(db, 'categories', id));
                showToast('Category deleted.');
            } catch (error) {
                console.error("Delete Error:", error);
                showToast('Error deleting category.');
            }
        }
    };

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
