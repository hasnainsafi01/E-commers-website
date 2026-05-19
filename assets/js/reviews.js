import { db } from './firebase-config.js';
import { collection, collectionGroup, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const reviewsTableBody = document.getElementById('reviewsTableBody');
    const reviewsCountText = document.getElementById('reviewsCount');
    const reviewsSearch = document.getElementById('reviewsSearch');
    const ratingFilter = document.getElementById('ratingFilter');

    // Delete Modal Elements
    const deleteModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    let allReviews = [];
    let productCache = {};
    let reviewToDelete = null;

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

    // 1. Setup real-time listener on products to build a live cache
    const fetchProductsAndReviews = () => {
        const productsRef = collection(db, 'products');
        onSnapshot(productsRef, (productsSnapshot) => {
            productCache = {};
            productsSnapshot.forEach(docSnap => {
                productCache[docSnap.id] = docSnap.data();
            });
            // Once products cache is populated or updated, render reviews
            renderReviewsTable();
        });

        // 2. Setup real-time listener on collectionGroup 'reviews'
        try {
            const reviewsRef = collectionGroup(db, 'reviews');
            onSnapshot(reviewsRef, (reviewsSnapshot) => {
                allReviews = [];
                reviewsSnapshot.forEach(docSnap => {
                    const reviewData = docSnap.data();
                    const productId = docSnap.ref.parent.parent ? docSnap.ref.parent.parent.id : null;
                    allReviews.push({
                        id: docSnap.id,
                        productId: productId,
                        ...reviewData
                    });
                });
                renderReviewsTable();
                updateStats();
            }, (error) => {
                console.error("Firestore reviews group error:", error);
                // Fallback: If Collection Group fails (e.g. index/rules constraint), inform admin
                showToast("Reviews collection group error. Check database rules/indexes.", "error");
            });
        } catch (e) {
            console.error("Error setting up reviews listener:", e);
        }
    };

    // 3. Render Reviews Table
    const renderReviewsTable = () => {
        const query = reviewsSearch.value.toLowerCase().trim();
        const ratingVal = ratingFilter.value;

        reviewsTableBody.innerHTML = '';

        const filtered = allReviews.filter(rev => {
            const reviewerName = (rev.userName || rev.userDisplayName || 'Anonymous').toLowerCase();
            const reviewerEmail = (rev.userEmail || '').toLowerCase();
            const comment = (rev.comment || rev.reviewText || '').toLowerCase();
            const rating = rev.rating !== undefined ? parseInt(rev.rating) : 0;
            
            // Product title from cache
            const product = productCache[rev.productId];
            const productTitle = product ? (product.title || '').toLowerCase() : '';

            const matchesSearch = reviewerName.includes(query) || 
                                  reviewerEmail.includes(query) || 
                                  comment.includes(query) || 
                                  productTitle.includes(query);

            const matchesRating = ratingVal === 'all' || rating === parseInt(ratingVal);

            return matchesSearch && matchesRating;
        });

        if (filtered.length === 0) {
            reviewsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 50px; color: var(--admin-text-secondary);">No reviews found matching your search.</td></tr>';
            return;
        }

        filtered.forEach(rev => {
            const rating = rev.rating !== undefined ? parseInt(rev.rating) : 0;
            const reviewerName = rev.userName || rev.userDisplayName || 'Anonymous';
            const reviewerEmail = rev.userEmail || 'N/A';
            const comment = rev.comment || rev.reviewText || 'No comment text provided.';
            const date = rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleDateString() : 'N/A';

            // Get product info from cache
            const product = productCache[rev.productId];
            const productTitle = product ? product.title : 'Deleted Product';
            const productImg = (product && product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/50';

            // Render Stars Rating
            let starsHTML = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= rating) {
                    starsHTML += '<i class="fas fa-star" style="color: #ebac14; font-size: 0.85rem; margin-right: 2px;"></i>';
                } else {
                    starsHTML += '<i class="far fa-star" style="color: var(--admin-text-secondary); font-size: 0.85rem; margin-right: 2px;"></i>';
                }
            }

            const row = `
                <tr>
                    <td>
                        <div class="prod-cell">
                            <img src="${productImg}" alt="${productTitle}" class="prod-thumb" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(productTitle)}&background=random'">
                            <div class="prod-info">
                                <span style="font-weight: 600; display: block;">${productTitle}</span>
                                <span style="font-size: 0.7rem; color: var(--admin-text-secondary);">Product ID: ${rev.productId ? rev.productId.substring(0, 8) : 'N/A'}...</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-weight: 600;">${reviewerName}</span>
                            <span style="font-size: 0.75rem; color: var(--admin-text-secondary);">${reviewerEmail}</span>
                        </div>
                    </td>
                    <td>${starsHTML}</td>
                    <td style="max-width: 300px; white-space: normal; line-height: 1.5; font-size: 0.85rem;">${comment}</td>
                    <td>${date}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon delete" onclick="handleDeleteReview('${rev.productId}', '${rev.id}')" title="Delete Review">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            reviewsTableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // 4. Update stats summary
    const updateStats = () => {
        if (!reviewsCountText) return;
        const total = allReviews.length;
        const avg = total > 0 
            ? (allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total).toFixed(1)
            : '0.0';
        reviewsCountText.innerText = `${total} Total Customer Reviews • Average Rating: ${avg} ★`;
    };

    // 5. Delete Review modal triggers
    window.handleDeleteReview = (productId, reviewId) => {
        reviewToDelete = { productId, reviewId };
        if (deleteModal) {
            deleteModal.classList.add('active');
        }
    };

    const closeDeleteModal = () => {
        if (deleteModal) {
            deleteModal.classList.remove('active');
        }
        reviewToDelete = null;
    };

    if (cancelDeleteBtn) cancelDeleteBtn.onclick = closeDeleteModal;
    const modalCloseBtn = deleteModal ? deleteModal.querySelector('.modal-close') : null;
    if (modalCloseBtn) modalCloseBtn.onclick = closeDeleteModal;

    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = async () => {
            if (!reviewToDelete) return;
            const { productId, reviewId } = reviewToDelete;

            try {
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

                // Delete document from product's reviews subcollection
                const reviewRef = doc(db, 'products', productId, 'reviews', reviewId);
                await deleteDoc(reviewRef);

                showToast("Review deleted successfully!");
                closeDeleteModal();
            } catch (error) {
                console.error("Delete review error:", error);
                showToast("Failed to delete review.", "error");
            } finally {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
            }
        };
    }

    // Filters listeners
    reviewsSearch.addEventListener('input', renderReviewsTable);
    ratingFilter.addEventListener('change', renderReviewsTable);

    // Initial load
    fetchProductsAndReviews();
});
