import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';

export class UserManager {
    static async refreshUsersList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/`);
            if (!response.ok) throw new Error('Failed to fetch users');

            const users = await response.json();
            const tableBody = document.getElementById('users-table-body');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            users.forEach(user => {
                if (user.id === AuthManager.currentUser?.id) return; // Skip current user

                const row = document.createElement('tr');
                row.setAttribute('data-user-id', user.id);
                
                const isOnline = ChatManager.onlineUsers.has(user.id);
                const isBlocked = ChatManager.blockedUsers.has(user.id);

                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${user.avatar_url || '/media/avatars/default.svg'}" 
                                 alt="${user.username}" 
                                 class="rounded-circle me-2"
                                 style="width: 32px; height: 32px;"
                                 onerror="this.src='/media/avatars/default.svg'">
                            <span class="username" style="cursor: pointer; text-decoration: underline;">
                                ${user.username}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary chat-btn" ${isBlocked ? 'disabled' : ''}>
                                Chat
                            </button>
                            <button class="btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'} block-btn">
                                ${isBlocked ? 'Unblock' : 'Block'}
                            </button>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}" 
                              data-user-status="${user.id}">
                            ${isOnline ? 'Online' : 'Offline'}
                        </span>
                    </td>
                `;

                // Make username clickable
                const usernameElement = row.querySelector('.username');
                UIManager.makeUsernameClickable(usernameElement, user.id, user.username);

                // Add chat button handler with modal closing
                const chatBtn = row.querySelector('.chat-btn');
                chatBtn.addEventListener('click', () => {
                    const usersModal = bootstrap.Modal.getInstance(document.getElementById('usersListModal'));
                    if (usersModal) {
                        usersModal.hide();
                        // Remove modal backdrop and reset body styles
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) {
                            backdrop.remove();
                        }
                        document.body.classList.remove('modal-open');
                        document.body.style.removeProperty('padding-right');
                        document.body.style.removeProperty('overflow');
                    }
                    ChatManager.startChat(user.id, user.username);
                });

                // Add block button handler
                const blockBtn = row.querySelector('.block-btn');
                blockBtn.addEventListener('click', async () => {
                    const isCurrentlyBlocked = blockBtn.textContent.trim() === 'Unblock';
                    const success = isCurrentlyBlocked ? 
                        await ChatManager.unblockUser(user.id) : 
                        await ChatManager.blockUser(user.id);
                    
                    if (success) {
                        if (isCurrentlyBlocked) {
                            ChatManager.blockedUsers.delete(user.id);
                        } else {
                            ChatManager.blockedUsers.add(user.id);
                        }
                        this.refreshUsersList();
                    }
                });

                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error refreshing users list:', error);
            UIManager.showToast('Failed to load users list', 'danger');
        }
    }

    static async searchUsers(query) {
        try {
            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/search/?q=${encodeURIComponent(query)}`
            );
            
            if (!response.ok) throw new Error('Search failed');
            
            return await response.json();
        } catch (error) {
            console.error('User search error:', error);
            UIManager.showToast('Failed to search users', 'danger');
            return [];
        }
    }

    static async getUserProfile(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/${userId}/`);
            if (!response.ok) throw new Error('Failed to fetch user profile');
            return await response.json();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    static async getUserMatches(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}matches/history/${userId}/?limit=${AuthManager.RECENT_MATCHES_LIMIT}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch user matches');
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching user matches:', error);
            return [];
        }
    }

    static initializeEventListeners() {
        // Add search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            let debounceTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(async () => {
                    const query = e.target.value.trim();
                    if (query.length >= 2) {
                        const users = await this.searchUsers(query);
                        this.updateUsersTable(users);
                    } else if (query.length === 0) {
                        this.refreshUsersList();
                    }
                }, 300);
            });
        }

        // Add users modal event listener
        const showUsersBtn = document.getElementById('show-users-btn');
        if (showUsersBtn) {
            showUsersBtn.addEventListener('click', async () => {
                await this.refreshUsersList();
                const usersModal = new bootstrap.Modal(document.getElementById('usersListModal'));
                usersModal.show();
            });
        }

        // Add modal cleanup on hide
        const usersModal = document.getElementById('usersListModal');
        if (usersModal) {
            usersModal.addEventListener('hidden.bs.modal', () => {
                const searchInput = document.getElementById('user-search');
                if (searchInput) {
                    searchInput.value = ''; // Clear search input
                }
                // Remove modal backdrop and reset body styles
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
                
                // Optionally refresh the users list for next time
                this.refreshUsersList();
            });
        }
    }

    static updateUsersTable(users) {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (users.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" class="text-center">
                    No users found
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        users.forEach(user => {
            if (user.id === AuthManager.currentUser?.id) return;

            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id);
            
            const isOnline = ChatManager.onlineUsers.has(user.id);
            const isBlocked = ChatManager.blockedUsers.has(user.id);

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${user.avatar_url || '/media/avatars/default.svg'}" 
                             alt="${user.username}" 
                             class="rounded-circle me-2"
                             style="width: 32px; height: 32px;"
                             onerror="this.src='/media/avatars/default.svg'">
                        <span class="username" style="cursor: pointer; text-decoration: underline;">
                            ${user.username}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-primary chat-btn" ${isBlocked ? 'disabled' : ''}>
                            Chat
                        </button>
                        <button class="btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'} block-btn">
                            ${isBlocked ? 'Unblock' : 'Block'}
                        </button>
                    </div>
                </td>
                <td>
                    <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}" 
                          data-user-status="${user.id}">
                        ${isOnline ? 'Online' : 'Offline'}
                    </span>
                </td>
            `;

            // Add event listeners
            const usernameElement = row.querySelector('.username');
            UIManager.makeUsernameClickable(usernameElement, user.id, user.username);

            // Add chat button handler with modal closing
            const chatBtn = row.querySelector('.chat-btn');
            chatBtn.addEventListener('click', () => {
                const usersModal = bootstrap.Modal.getInstance(document.getElementById('usersListModal'));
                if (usersModal) {
                    usersModal.hide();
                    // Remove modal backdrop and reset body styles
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.remove();
                    }
                    document.body.classList.remove('modal-open');
                    document.body.style.removeProperty('padding-right');
                    document.body.style.removeProperty('overflow');
                }
                ChatManager.startChat(user.id, user.username);
            });

            const blockBtn = row.querySelector('.block-btn');
            blockBtn.addEventListener('click', async () => {
                const isCurrentlyBlocked = blockBtn.textContent.trim() === 'Unblock';
                const success = isCurrentlyBlocked ? 
                    await ChatManager.unblockUser(user.id) : 
                    await ChatManager.blockUser(user.id);
                
                if (success) {
                    if (isCurrentlyBlocked) {
                        ChatManager.blockedUsers.delete(user.id);
                    } else {
                        ChatManager.blockedUsers.add(user.id);
                    }
                    this.refreshUsersList();
                }
            });

            tableBody.appendChild(row);
        });
    }
} 