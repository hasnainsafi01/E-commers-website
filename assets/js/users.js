import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const usersTableBody = document.getElementById('usersTableBody');
    const usersCount = document.getElementById('usersCount');
    const userSearch = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');

    // Modal Elements
    const roleModal = document.getElementById('roleModal');
    const closeRoleModal = document.getElementById('closeRoleModal');
    const cancelRoleBtn = document.getElementById('cancelRole');
    const roleForm = document.getElementById('roleForm');
    const editUserId = document.getElementById('editUserId');
    const editUserName = document.getElementById('editUserName');
    const editUserRole = document.getElementById('editUserRole');

    let allUsers = [];

    // Toast function
    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('statusToast');
        if (toast) {
            toast.className = `toast ${type === 'error' ? 'error' : ''}`;
            toast.querySelector('span').innerText = message;
            toast.classList.add('active');
            setTimeout(() => toast.classList.remove('active'), 4000);
        }
    };

    // 1. Setup Real-time Listener on Users
    const fetchUsers = () => {
        const usersRef = collection(db, 'users');
        onSnapshot(usersRef, (snapshot) => {
            allUsers = [];
            snapshot.forEach(docSnap => {
                allUsers.push({ id: docSnap.id, ...docSnap.data() });
            });
            renderUsers();
            if (usersCount) {
                usersCount.innerText = `${allUsers.length} Registered Members`;
            }
        }, (error) => {
            console.error("Firestore Users Error:", error);
            showToast("Failed to fetch users.", "error");
        });
    };

    // 2. Render Users Table
    const renderUsers = () => {
        const query = userSearch.value.toLowerCase().trim();
        const role = roleFilter.value;

        usersTableBody.innerHTML = '';

        const filtered = allUsers.filter(user => {
            const name = (user.name || user.displayName || 'Unnamed User').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const userRole = (user.role || 'customer').toLowerCase();
            
            const matchesSearch = name.includes(query) || email.includes(query) || userRole.includes(query);
            const matchesRole = role === 'all' || userRole === role;

            return matchesSearch && matchesRole;
        });

        if (filtered.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 50px; color: var(--admin-text-secondary);">No users found matching your search.</td></tr>';
            return;
        }

        filtered.forEach(user => {
            const name = user.name || user.displayName || 'Unnamed User';
            const email = user.email || 'N/A';
            const userRole = user.role || 'customer';
            const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            const joinedDate = user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A';

            // Role Badge styling
            let roleClass = 'status-pending';
            if (userRole === 'admin') roleClass = 'status-processing';
            else if (userRole === 'curator') roleClass = 'status-shipped';
            else if (userRole === 'customer') roleClass = 'status-delivered';

            const row = `
                <tr>
                    <td>
                        <div class="client-cell">
                            <img src="${photoURL}" alt="${name}" class="client-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random'" style="width: 35px; height: 35px; border-radius: 8px; object-fit: cover;">
                            <span style="font-weight: 600;">${name}</span>
                        </div>
                    </td>
                    <td>${email}</td>
                    <td>
                        <span class="status-badge ${roleClass}">
                            ${userRole}
                        </span>
                    </td>
                    <td>${joinedDate}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon" onclick="openRoleModal('${user.id}')" title="Change Role">
                                <i class="fas fa-user-shield"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            usersTableBody.insertAdjacentHTML('beforeend', row);
        });
    };

    // 3. Edit Role Modal Event Handling
    window.openRoleModal = (id) => {
        const user = allUsers.find(u => u.id === id);
        if (!user) return;

        editUserId.value = user.id;
        editUserName.value = user.name || user.displayName || 'Unnamed User';
        editUserRole.value = user.role || 'customer';

        roleModal.classList.add('active');
    };

    const closeModal = () => {
        roleModal.classList.remove('active');
        roleForm.reset();
    };

    closeRoleModal.onclick = closeModal;
    cancelRoleBtn.onclick = closeModal;

    roleForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = editUserId.value;
        const newRole = editUserRole.value;

        try {
            const submitBtn = roleForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            // Update user document in Firestore users collection
            const userRef = doc(db, 'users', id);
            await updateDoc(userRef, { role: newRole });

            showToast("User role updated successfully!");
            closeModal();
        } catch (error) {
            console.error("Error updating user role:", error);
            showToast("Failed to update user role.", "error");
        } finally {
            const submitBtn = roleForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    };

    // 4. Search and Filter Listeners
    userSearch.addEventListener('input', renderUsers);
    roleFilter.addEventListener('change', renderUsers);

    // Initial load
    fetchUsers();
});
