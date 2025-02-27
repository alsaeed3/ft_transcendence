import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';
import { LanguageManager } from './LanguageManager.js';

export class UserManager {
    static usersModal = null;

    static initializeEventListeners() {
        // Initialize modal only if it doesn't exist
        const usersListElement = document.getElementById('usersListModal');
        
        if (usersListElement && !this.usersModal) {
            this.usersModal = new bootstrap.Modal(usersListElement);
            
            // Handle modal cleanup and focus management
            usersListElement.addEventListener('hidden.bs.modal', () => {
                // Remove focus from any elements inside the modal before cleanup
                const focusedElement = document.activeElement;
                if (usersListElement.contains(focusedElement)) {
                    focusedElement.blur();
                }

                // Cleanup modal
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');

                // Return focus to the element that opened the modal
                const showUsersBtn = document.getElementById('show-users-btn');
                if (showUsersBtn) {
                    showUsersBtn.focus();
                }
            });

            // Handle modal shown event
            usersListElement.addEventListener('shown.bs.modal', async () => {
                await this.loadUsersList();
                // Request status update for all users
            const userIds = Array.from(document.querySelectorAll('#users-table-body [data-user-status]'))
                    .map(el => parseInt(el.getAttribute('data-user-status')))
                    .filter(id => !isNaN(id));
            
            if (userIds.length > 0 && ChatManager.statusSocket?.readyState === WebSocket.OPEN) {
                ChatManager.statusSocket.send(JSON.stringify({
                    type: 'get_status',
                        user_ids: userIds
                }));
            }
        });
        }

        // Show users list button handler
        document.getElementById('show-users-btn')?.addEventListener('click', () => {
            if (this.usersModal) {
                this.usersModal.show();
            }
        });
    }

    static async loadUsersList() {
        try {
            // Fetch both users list and blocked users (both directions)
            const [usersResponse, blockedResponse] = await Promise.all([
                AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/`),
                AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/blocked/`)
            ]);
            
            if (!usersResponse.ok) throw new Error('Failed to fetch users');
            if (!blockedResponse.ok) throw new Error('Failed to fetch blocked status');
            
            const users = await usersResponse.json();
            const blockedData = await blockedResponse.json();
            const tableBody = document.getElementById('users-table-body');
            
            // Update modal title and headers with translations
            document.querySelector('#usersListModalLabel').setAttribute('data-i18n', 'usersList');
            document.querySelector('#users-table th:nth-child(1)').setAttribute('data-i18n', 'username');
            document.querySelector('#users-table th:nth-child(2)').setAttribute('data-i18n', 'status');
            document.querySelector('#users-table th:nth-child(3)').setAttribute('data-i18n', 'actions');
            
            tableBody.innerHTML = '';

            users.forEach(user => {
                if (user.id !== AuthManager.currentUser.id) {
                    const isOnline = ChatManager.onlineUsers.has(user.id);
                    const statusText = isOnline ? 
                        LanguageManager.getTranslation('online') : 
                        LanguageManager.getTranslation('offline');
                    const row = document.createElement('tr');
                    row.setAttribute('data-user-id', user.id);
                    
                    // Check if either user has blocked the other
                    const isBlocked = user.is_blocked;
                    const isBlockedByUser = blockedData.blocked_by.includes(user.id);
                    
                    if (isBlocked || isBlockedByUser) {
                        row.classList.add('blocked-user');
                    }

                    // Determine the actions cell content based on blocking status
                    let actionsContent;
                    if (isBlockedByUser) {
                        actionsContent = `<span class="text-muted" data-i18n="blockedByUser">Blocked by user</span>`;
                    } else if (isBlocked) {
                        actionsContent = `
                            <button class="btn btn-sm btn-secondary block-btn" 
                                    title="${LanguageManager.getTranslation('unblock')} ${user.username}">
                                <span data-i18n="unblock">Unblock</span>
                            </button>`;
                    } else {
                        actionsContent = `
                            <button class="btn btn-sm btn-primary chat-btn" 
                                    title="${LanguageManager.getTranslation('chat')} ${user.username}">
                                <i class="bi bi-chat-dots"></i>
                                <span data-i18n="chat">Chat</span>
                            </button>
                            <button class="btn btn-sm btn-danger block-btn" 
                                    title="${LanguageManager.getTranslation('block')} ${user.username}">
                                <span data-i18n="block">Block</span>
                            </button>`;
                    }

                    row.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${user.avatar_url || '/media/avatars/default.svg'}" 
                                     alt="${user.username}" 
                                     class="rounded-circle me-2"
                                     style="width: 24px; height: 24px;"
                                     onerror="this.src='/media/avatars/default.svg'">
                                <span class="user-username">
                                    ${user.username}
                                </span>
                            </div>
                        </td>
                        <td>
                            <span class="badge" 
                                  data-user-status="${user.id}"
                                  data-user-name="${user.username}"
                                  style="background-color: ${isOnline ? '#198754' : '#6c757d'}"
                                  data-i18n="${isOnline ? 'online' : 'offline'}">
                                ${statusText}
                            </span>
                        </td>
                        <td class="text-end">
                            ${actionsContent}
                        </td>
                    `;

                    // Add event listeners
                    if (!isBlockedByUser) {
                        const chatBtn = row.querySelector('.chat-btn');
                        if (chatBtn && !isBlocked) {
                            chatBtn.addEventListener('click', () => {
                                chatBtn.blur();
                                const modal = bootstrap.Modal.getInstance(document.getElementById('usersListModal'));
                                if (modal) {
                                    modal.hide();
                                }
                                ChatManager.startChat(user.id, user.username);
                            });
                        }

                        const blockBtn = row.querySelector('.block-btn');
                        if (blockBtn) {
                            blockBtn.addEventListener('click', async () => {
                                blockBtn.blur();
                                if (isBlocked) {
                                    const success = await ChatManager.unblockUser(user.id);
                                    if (success) {
                                        await this.loadUsersList();
                                    }
                                } else {
                                    const success = await ChatManager.blockUser(user.id);
                                    if (success) {
                                        await this.loadUsersList();
                                        if (ChatManager.currentChatPartner?.id === user.id) {
                                            ChatManager.closeChat();
                                        }
                                    }
                                }
                            });
                        }
                    }

                    tableBody.appendChild(row);

                    // Make username clickable
                    const usernameEl = row.querySelector('.user-username');
                    UIManager.makeUsernameClickable(usernameEl, user.id, user.username);
                }
            });

            // Update translations after adding new content
            LanguageManager.updateContent();
        } catch (error) {
            console.error('Error updating users list:', error);
            UIManager.showToast('Failed to update users list', 'danger');
        }
    }

    static async refreshUsersList() {
        if (document.getElementById('usersListModal').classList.contains('show')) {
            await this.loadUsersList();
        }
    }

    static async blockUser(userId) {
        try {
            const success = await ChatManager.blockUser(userId);
            if (success) {
                // Immediately update the UI
                await this.loadUsersList();
                
                // Close chat if it's open with the blocked user
                if (ChatManager.currentChatPartner?.id === userId) {
                    ChatManager.closeChat();
                }
                
                // Send WebSocket notification if socket is available
                if (ChatManager.statusSocket?.readyState === WebSocket.OPEN) {
                    ChatManager.statusSocket.send(JSON.stringify({
                        type: 'block_update',
                        blocked_id: userId
                    }));
                }
            }
            return success;
        } catch (error) {
            console.error('Error blocking user:', error);
            UIManager.showToast('Failed to block user', 'danger');
            return false;
        }
    }

    static async unblockUser(userId) {
        try {
            const success = await ChatManager.unblockUser(userId);
            if (success) {
                // Immediately update the UI
                await this.loadUsersList();
                
                // Send WebSocket notification if socket is available
                if (ChatManager.statusSocket?.readyState === WebSocket.OPEN) {
                    ChatManager.statusSocket.send(JSON.stringify({
                        type: 'block_update',
                        unblocked_id: userId
                    }));
                }
            }
            return success;
        } catch (error) {
            console.error('Error unblocking user:', error);
            UIManager.showToast('Failed to unblock user', 'danger');
            return false;
        }
    }
} 