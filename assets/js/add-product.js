import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Cloudinary Configuration (Placeholders)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET";

document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('addProductForm');
    const imageInput = document.getElementById('productImages');
    const dropzone = document.getElementById('imageDropzone');
    const previewGrid = document.getElementById('previewGrid');
    const publishBtn = document.getElementById('publishBtn');

    let selectedFiles = [];

    // 1. Handle File Selection
    const handleFiles = (files) => {
        const fileArray = Array.from(files);
        selectedFiles = [...selectedFiles, ...fileArray];
        renderPreviews();
    };

    imageInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--admin-accent)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--admin-border)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--admin-border)';
        handleFiles(e.dataTransfer.files);
    });

    dropzone.addEventListener('click', () => imageInput.click());

    // 2. Render Previews
    const renderPreviews = () => {
        previewGrid.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewHTML = `
                    <div class="preview-item">
                        <img src="${e.target.result}" alt="Preview">
                        <button class="remove-btn" onclick="removeImage(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                previewGrid.insertAdjacentHTML('beforeend', previewHTML);
            };
            reader.readAsDataURL(file);
        });
    };

    window.removeImage = (index) => {
        selectedFiles.splice(index, 1);
        renderPreviews();
    };

    // 3. Upload to Cloudinary
    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Cloudinary upload failed');
        const data = await response.json();
        return data.secure_url;
    };

    // 4. Handle Form Submission
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (selectedFiles.length === 0) {
            showToast('Please upload at least one image');
            return;
        }

        try {
            publishBtn.disabled = true;
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

            // Upload all images sequentially
            const imageUrls = [];
            for (const file of selectedFiles) {
                const url = await uploadToCloudinary(file);
                imageUrls.push(url);
            }

            // Save to Firestore
            const productData = {
                title: document.getElementById('prodTitle').value,
                price: parseFloat(document.getElementById('prodPrice').value),
                discount: parseFloat(document.getElementById('prodDiscount').value) || 0,
                stock: parseInt(document.getElementById('prodStock').value),
                category: document.getElementById('prodCategory').value,
                description: document.getElementById('prodDesc').value,
                images: imageUrls,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'products'), productData);

            showToast('Product Published Successfully!');
            productForm.reset();
            selectedFiles = [];
            renderPreviews();

        } catch (error) {
            console.error("Error:", error);
            showToast('Error: ' + error.message);
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Product';
        }
    });

    function showToast(msg) {
        const toast = document.getElementById('statusToast');
        toast.querySelector('span').innerText = msg;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 4000);
    }
});
