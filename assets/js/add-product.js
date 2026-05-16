import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Cloudinary Configuration
const CLOUD_NAME = "dqsvcn94y";
const UPLOAD_PRESET = "ml_default"; // Use an unsigned preset from your Cloudinary settings
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('addProductForm');
    const imageInput = document.getElementById('productImages');
    const dropzone = document.getElementById('imageDropzone');
    const previewGrid = document.getElementById('previewGrid');
    const publishBtn = document.getElementById('publishBtn');
    const categorySelect = document.getElementById('prodCategory');
    
    // Progress Bar Elements
    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressBarFill = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadStatusText');
    const progressPercentage = document.getElementById('uploadPercentage');

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

    // 3. Upload to Cloudinary with Progress Tracking
    const uploadToCloudinary = (file, currentFileIndex, totalFiles) => {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', CLOUDINARY_URL, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    // Calculate individual file progress
                    const fileProgress = (e.loaded / e.total) * 100;
                    // Calculate total overall progress
                    const totalProgress = ((currentFileIndex / totalFiles) * 100) + (fileProgress / totalFiles);
                    
                    progressBarFill.style.width = `${totalProgress}%`;
                    progressPercentage.innerText = `${Math.round(totalProgress)}%`;
                    progressText.innerText = `Uploading image ${currentFileIndex + 1} of ${totalFiles}...`;
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
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
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            progressContainer.style.display = 'block';
            progressBarFill.style.width = '0%';
            progressPercentage.innerText = '0%';

            // Upload all images sequentially
            const imageUrls = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                const url = await uploadToCloudinary(selectedFiles[i], i, selectedFiles.length);
                imageUrls.push(url);
            }

            progressText.innerText = "Finalizing product...";

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
            
            // Hide progress after success
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error("Error:", error);
            showToast('Upload Error: ' + error.message);
            progressText.innerText = "Upload failed.";
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Product';
        }
    });

    // 5. Fetch and Populate Categories
    const fetchCategories = async () => {
        try {
            const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            
            categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            
            querySnapshot.forEach((doc) => {
                const cat = doc.data();
                const option = document.createElement('option');
                option.value = cat.name;
                option.innerText = cat.name;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    fetchCategories();

    function showToast(msg) {
        const toast = document.getElementById('statusToast');
        if (toast) {
            toast.querySelector('span').innerText = msg;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 4000);
        }
    }
});
