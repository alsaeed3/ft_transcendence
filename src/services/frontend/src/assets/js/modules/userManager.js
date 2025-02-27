import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';

export class UserManager {
    static usersModal = null;

    static initializeEventListeners() {
        // Initialize modal only if it doesn't exist
        const usersListElement = document.getElementById('usersListModal');
        
        if (usersListElement && !this.usersModal) {
            this.usersModal = new bootstrap.Modal(usersListElement);
            
            // Handle modal cleanup
            usersListElement.addEventListener('hidden.bs.modal', () => {
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
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
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();

            const tableBody = document.getElementById('users-table-body');
            tableBody.innerHTML = '';

            users.forEach(user => {
                if (user.id !== AuthManager.currentUser.id) {
                    const isOnline = ChatManager.onlineUsers.has(user.id);
                    const row = document.createElement('tr');
                    row.setAttribute('data-user-id', user.id);
                    if (user.is_blocked) {
                        row.classList.add('blocked-user');
                    }
                    row.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${user.avatar_url || '/media/avatars/default.svg'}" 
                                     alt="${user.username}" 
                                     class="rounded-circle me-2"
                                     style="width: 24px; height: 24px;"
                                     onerror="this.src='/media/avatars/default.svg'">
                                <span class="user-username clickable-username">
                                    ${user.username}
                                </span>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}" 
                                  data-user-status="${user.id}"
                                  data-user-name="${user.username}">
                                ${isOnline ? 'Online' : 'Offline'}
                        </span>
                        </td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-primary me-1 chat-btn" 
                                    title="Chat with ${user.username}"
                                    ${user.is_blocked ? 'disabled' : ''}>
                                <i class="bi bi-chat-dots"></i>
                            </button>
                            <button class="btn btn-sm btn-danger block-btn" 
                                    title="${user.is_blocked ? 'Unblock' : 'Block'} ${user.username}">
                                ${user.is_blocked ? 'Unblock' : 'Block'}
                            </button>
                        </td>
                    `;

                    // Add event listeners
                    const chatBtn = row.querySelector('.chat-btn');
                    chatBtn.addEventListener('click', () => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('usersListModal'));
                        if (modal) {
                            modal.hide();
                        }
                        ChatManager.startChat(user.id, user.username);
                    });

                    const blockBtn = row.querySelector('.block-btn');
                    blockBtn.addEventListener('click', async () => {
                        const isBlocked = row.classList.contains('blocked-user');
                        if (isBlocked) {
                            const success = await ChatManager.unblockUser(user.id);
                            if (success) {
                                blockBtn.textContent = 'Block';
                                blockBtn.title = `Block ${user.username}`;
                                row.classList.remove('blocked-user');
                                chatBtn.disabled = false;
                            }
                        } else {
                            const success = await ChatManager.blockUser(user.id);
                            if (success) {
                                blockBtn.textContent = 'Unblock';
                                blockBtn.title = `Unblock ${user.username}`;
                                row.classList.add('blocked-user');
                                chatBtn.disabled = true;
                                // Close chat if it's open with the blocked user
                                if (ChatManager.currentChatPartner?.id === user.id) {
                                    ChatManager.closeChat();
                                }
                            }
                        }
                    });

                    tableBody.appendChild(row);

                    // Make username clickable
                    const usernameEl = row.querySelector('.user-username');
                    UIManager.makeUsernameClickable(usernameEl, user.id, user.username);
                }
            });
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
} 