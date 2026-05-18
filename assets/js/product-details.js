import { db, auth } from './firebase-config.js';
import { doc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = urlParams.get('id');

    if (!prodId) {
        window.location.href = 'products.html';
        return;
    }

    const prodNameEl = document.getElementById('prodName');
    const prodPriceEl = document.getElementById('prodPrice');
    const mainImgEl = document.getElementById('mainImg');
    const descEl = document.querySelector('.details-desc');
    const breadcrumbsEl = document.querySelector('.breadcrumbs');
    const addBagBtn = document.querySelector('.add-bag-btn');
    const saveWishlistBtn = document.querySelector('.save-wishlist-btn');
    const thumbnailsGrid = document.querySelector('.thumbnails-grid');

    // Dynamic Stock Badge Placeholder
    const stockBadgeContainer = document.createElement('div');
    stockBadgeContainer.id = 'detailsStockBadge';
    stockBadgeContainer.style.marginBottom = '25px';
    prodPriceEl.parentNode.insertBefore(stockBadgeContainer, descEl);

    let activeProduct = null;
    let currentUser = null;

    // 1. Subscribe to Product Details
    onSnapshot(doc(db, 'products', prodId), (docSnap) => {
        if (!docSnap.exists()) {
            window.showToast("Product does not exist.", "error");
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }

        const prod = docSnap.data();
        activeProduct = { id: docSnap.id, ...prod };

        // Bind data
        prodNameEl.innerText = prod.title;
        prodPriceEl.innerText = `$${prod.price.toLocaleString()}.00`;
        descEl.innerText = prod.description;
        breadcrumbsEl.innerText = `${prod.category} / Premium Collection / ${prod.title}`;
        document.title = `${prod.title} | CHENARI`;

        // Render Main Image
        const mainImgUrl = prod.images && prod.images.length > 0 ? prod.images[0] : 'assets/images/default.png';
        mainImgEl.src = mainImgUrl;

        // Render Thumbnails
        if (thumbnailsGrid && prod.images && prod.images.length > 0) {
            thumbnailsGrid.innerHTML = '';
            prod.images.forEach((imgUrl, index) => {
                const thumbDiv = document.createElement('div');
                thumbDiv.className = `thumb ${index === 0 ? 'active' : ''}`;
                thumbDiv.innerHTML = `<img src="${imgUrl}" alt="View ${index + 1}">`;
                thumbDiv.onclick = () => {
                    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                    thumbDiv.classList.add('active');
                    mainImgEl.src = imgUrl;
                };
                thumbnailsGrid.appendChild(thumbDiv);
            });
        }

        // Render Stock badge and lock control
        const stock = prod.stock !== undefined ? parseInt(prod.stock) : 0;
        if (stock === 0) {
            stockBadgeContainer.innerHTML = `<span style="color: var(--primary-red); font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;"><i class="fas fa-exclamation-triangle"></i> Out of Stock</span>`;
            if (addBagBtn) {
                addBagBtn.disabled = true;
                addBagBtn.innerHTML = '<i class="fas fa-lock"></i> Out of Stock';
                addBagBtn.style.background = 'var(--nav-border)';
                addBagBtn.style.cursor = 'not-allowed';
                addBagBtn.style.opacity = '0.5';
            }
        } else if (stock <= 3) {
            stockBadgeContainer.innerHTML = `<span style="color: #d97706; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;"><i class="fas fa-hourglass-half"></i> Only ${stock} pieces left</span>`;
            if (addBagBtn) {
                addBagBtn.disabled = false;
                addBagBtn.innerHTML = 'Add to Shopping Bag';
                addBagBtn.style.background = '';
                addBagBtn.style.cursor = 'pointer';
                addBagBtn.style.opacity = '1';
            }
        } else {
            stockBadgeContainer.innerHTML = `<span style="color: #666; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-check-circle" style="color: #27ae60; margin-right: 5px;"></i> In Stock (${stock} available)</span>`;
            if (addBagBtn) {
                addBagBtn.disabled = false;
                addBagBtn.innerHTML = 'Add to Shopping Bag';
                addBagBtn.style.background = '';
                addBagBtn.style.cursor = 'pointer';
                addBagBtn.style.opacity = '1';
            }
        }

        // Render Rating Summary
        const rating = prod.rating !== undefined ? parseFloat(prod.rating) : 5.0;
        document.getElementById('averageRatingText').innerText = rating.toFixed(1);

        const averageRatingStars = document.getElementById('averageRatingStars');
        if (averageRatingStars) {
            averageRatingStars.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= Math.floor(rating)) {
                    averageRatingStars.innerHTML += `<i class="fas fa-star" style="color: #ebac14;"></i>`;
                } else if (i - 0.5 <= rating) {
                    averageRatingStars.innerHTML += `<i class="fas fa-star-half-alt" style="color: #ebac14;"></i>`;
                } else {
                    averageRatingStars.innerHTML += `<i class="far fa-star" style="color: var(--nav-border);"></i>`;
                }
            }
        }
    });

    // 2. Add to Shopping Bag Action
    if (addBagBtn) {
        addBagBtn.onclick = () => {
            if (!activeProduct) return;
            const cartProduct = {
                id: activeProduct.id,
                title: activeProduct.title,
                name: activeProduct.title,
                price: activeProduct.price,
                image: activeProduct.images && activeProduct.images.length > 0 ? activeProduct.images[0] : 'assets/images/default.png',
                category: activeProduct.category,
                quantity: 1
            };
            if (window.addToCart) {
                window.addToCart(cartProduct);
            }
        };
    }

    // 3. Save Wishlist Action
    if (saveWishlistBtn) {
        saveWishlistBtn.onclick = () => {
            if (!activeProduct) return;
            const favProduct = {
                id: activeProduct.id,
                title: activeProduct.title,
                name: activeProduct.title,
                price: activeProduct.price,
                image: activeProduct.images && activeProduct.images.length > 0 ? activeProduct.images[0] : 'assets/images/default.png',
                category: activeProduct.category
            };
            if (window.handleFavClick) {
                window.handleFavClick(saveWishlistBtn, favProduct);
            }
        };
    }

    // 4. Handle Star Selection inside Review Form
    const starInputSelect = document.getElementById('starRatingSelect');
    const selectedRatingInput = document.getElementById('selectedRating');
    if (starInputSelect) {
        const stars = starInputSelect.querySelectorAll('.rating-star');
        stars.forEach(star => {
            star.onclick = () => {
                const ratingValue = parseInt(star.dataset.value);
                selectedRatingInput.value = ratingValue;

                stars.forEach((s, idx) => {
                    if (idx < ratingValue) {
                        s.classList.replace('far', 'fas');
                    } else {
                        s.classList.replace('fas', 'far');
                    }
                });
            };
        });
    }

    // 5. Auth State & Purchase History Verification
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        const reviewLockMsg = document.getElementById('reviewLockMsg');
        const submitReviewForm = document.getElementById('submitReviewForm');

        if (!user) {
            if (reviewLockMsg) {
                reviewLockMsg.innerHTML = `<i class="fas fa-lock" style="color: #a1a1a1; margin-right: 5px;"></i> Please <a href="#" onclick="window.showLoginRequiredModal ? window.showLoginRequiredModal({type:'review'}) : window.showToast('Please login first', 'error')" style="color: #1a1a1a; text-decoration: underline;">login</a> to submit a reflection.`;
                reviewLockMsg.style.display = 'block';
            }
            if (submitReviewForm) submitReviewForm.style.display = 'none';
            return;
        }

        try {
            // Verify if user purchased this product
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            let hasPurchased = false;
            querySnapshot.forEach(orderDoc => {
                const orderData = orderDoc.data();
                if (orderData.items && Array.isArray(orderData.items)) {
                    const match = orderData.items.find(item => item.productId === prodId);
                    if (match) {
                        hasPurchased = true;
                    }
                }
            });

            if (hasPurchased) {
                if (reviewLockMsg) reviewLockMsg.style.display = 'none';
                if (submitReviewForm) submitReviewForm.style.display = 'block';
            } else {
                if (reviewLockMsg) {
                    reviewLockMsg.innerHTML = `<i class="fas fa-lock" style="color: #a1a1a1; margin-right: 5px;"></i> Only verified owners of this exclusive piece from CHENARI can submit feedback.`;
                    reviewLockMsg.style.display = 'block';
                }
                if (submitReviewForm) submitReviewForm.style.display = 'none';
            }
        } catch (error) {
            console.error("Purchase history check failure:", error);
        }
    });

    // 6. Submit Review Form Action
    const submitReviewForm = document.getElementById('submitReviewForm');
    if (submitReviewForm) {
        submitReviewForm.onsubmit = async (e) => {
            e.preventDefault();

            if (!currentUser) {
                window.showToast("Please login to submit feedback.", "error");
                return;
            }

            const rating = parseInt(selectedRatingInput.value);
            const comment = document.getElementById('reviewComment').value.trim();

            if (!comment) {
                window.showToast("Reflection content cannot be blank.", "error");
                return;
            }

            try {
                // Fetch current user details for the author name
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : {};
                const authorName = userData.name || userData.displayName || currentUser.displayName || 'Luxury Connoisseur';

                const newReview = {
                    userId: currentUser.uid,
                    userName: authorName,
                    rating: rating,
                    comment: comment,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'products', prodId, 'reviews'), newReview);
                
                window.showToast("Reflection published successfully. Thank you!");
                submitReviewForm.reset();
                
                // Reset Star selection UI to 5 stars
                const stars = starInputSelect.querySelectorAll('.rating-star');
                stars.forEach(s => s.classList.replace('far', 'fas'));
                selectedRatingInput.value = 5;

            } catch (error) {
                console.error("Error submitting review:", error);
                window.showToast("Failed to submit review.", "error");
            }
        };
    }

    // 7. Subscribe to Product Reviews (Real-time feed)
    const reviewsList = document.getElementById('reviewsList');
    if (reviewsList) {
        const reviewsRef = collection(db, 'products', prodId, 'reviews');
        const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));

        onSnapshot(reviewsQuery, (snapshot) => {
            if (snapshot.empty) {
                reviewsList.innerHTML = `<div style="color: #888; font-size: 0.9rem; text-align: center; padding: 50px 0; font-style: italic;">No reflections have been left for this masterpiece yet.</div>`;
                return;
            }

            reviewsList.innerHTML = '';
            snapshot.forEach(docSnap => {
                const review = docSnap.data();
                const reviewDate = review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Recent';

                // Render Stars
                let starsHTML = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= review.rating) {
                        starsHTML += `<i class="fas fa-star" style="color: #ebac14; font-size: 0.75rem; margin-right: 2px;"></i>`;
                    } else {
                        starsHTML += `<i class="far fa-star" style="color: var(--nav-border); font-size: 0.75rem; margin-right: 2px;"></i>`;
                    }
                }

                const reviewItem = `
                    <div style="border-bottom: 1px solid rgba(0, 0, 0, 0.05); padding-bottom: 25px; margin-bottom: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <span style="font-weight: 700; font-size: 0.9rem; color: #1a1a1a; letter-spacing: 0.5px;">${review.userName}</span>
                                <span style="margin-left: 10px; font-size: 0.65rem; font-weight: 700; color: #27ae60; background: rgba(39, 174, 96, 0.08); padding: 3px 8px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase;">
                                    <i class="fas fa-check-circle" style="font-size: 0.7rem; margin-right: 3px;"></i> Verified Buyer
                                </span>
                            </div>
                            <span style="font-size: 0.75rem; color: #999;">${reviewDate}</span>
                        </div>
                        <div style="display: flex; margin-bottom: 12px;">
                            ${starsHTML}
                        </div>
                        <p style="font-size: 0.88rem; color: #555; line-height: 1.6; font-style: italic;">
                            "${review.comment}"
                        </p>
                    </div>
                `;
                reviewsList.insertAdjacentHTML('beforeend', reviewItem);
            });
        });
    }
});
