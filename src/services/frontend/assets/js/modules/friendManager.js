import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';
import { LanguageManager } from './LanguageManager.js';

export class FriendManager {
    static friendsModal = null;
    static addFriendModal = null;
    static isSubmitting = false;

    static initializeEventListeners() {
        // Initialize modals only if they don't exist
        const friendsListElement = document.getElementById('friendsListModal');
        const addFriendElement = document.getElementById('addFriendModal');

        // Clean up existing modals if they exist
        if (this.friendsModal) {
            this.friendsModal.dispose();
            this.friendsModal = null;
        }
        if (this.addFriendModal) {
            this.addFriendModal.dispose();
            this.addFriendModal = null;
        }

        if (friendsListElement) {
            this.friendsModal = new bootstrap.Modal(friendsListElement);
            
            // Handle modal cleanup
            friendsListElement.addEventListener('hidden.bs.modal', () => {
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
            });

            // Handle modal shown event
            friendsListElement.addEventListener('shown.bs.modal', async () => {
                await this.updateFriendListUI();
                // Request status update for all friends
                const friendIds = Array.from(document.querySelectorAll('#friend-list-body [data-user-status]'))
                    .map(el => parseInt(el.getAttribute('data-user-status')))
                    .filter(id => !isNaN(id));
                
                if (friendIds.length > 0 && ChatManager.statusSocket?.readyState === WebSocket.OPEN) {
                    ChatManager.statusSocket.send(JSON.stringify({
                        type: 'get_status',
                        user_ids: friendIds
                    }));
                }
            });
        }

        if (addFriendElement) {
            this.addFriendModal = new bootstrap.Modal(addFriendElement);
            
            // Handle modal cleanup
            addFriendElement.addEventListener('hidden.bs.modal', () => {
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                document.body.style.removeProperty('padding-right');
                document.body.style.removeProperty('overflow');
                // Clear input field and reset submit button
                const input = document.getElementById('friend-username');
                const submitBtn = document.getElementById('add-friend-form')?.querySelector('button[type="submit"]');
                if (input) input.value = '';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Send Friend Request';
                }
                this.isSubmitting = false;
            });
        }

        // Remove existing event listeners by cloning and replacing elements
        const showFriendsBtn = document.getElementById('show-friends-btn');
        if (showFriendsBtn) {
            const newShowFriendsBtn = showFriendsBtn.cloneNode(true);
            showFriendsBtn.parentNode.replaceChild(newShowFriendsBtn, showFriendsBtn);
            newShowFriendsBtn.addEventListener('click', () => {
                if (this.friendsModal) {
                    this.friendsModal.show();
                }
            });
        }

        const addFriendForm = document.getElementById('add-friend-form');
        if (addFriendForm) {
            const newAddFriendForm = addFriendForm.cloneNode(true);
            addFriendForm.parentNode.replaceChild(newAddFriendForm, addFriendForm);
            newAddFriendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
                if (this.isSubmitting) return;

                const submitBtn = newAddFriendForm.querySelector('button[type="submit"]');
            const usernameInput = document.getElementById('friend-username');
            const username = usernameInput.value.trim();
            
            if (username) {
                    this.isSubmitting = true;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

                    try {
                const success = await this.sendFriendRequest(username);
                if (success) {
                    usernameInput.value = '';
                    this.addFriendModal.hide();
                    await this.updateFriendListUI();
                    // Show friends list modal after successful add
                    setTimeout(() => this.friendsModal.show(), 150);
                }
                    } finally {
                        this.isSubmitting = false;
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Send Friend Request';
                    }
                }
            });
        }

        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            const newAddFriendBtn = addFriendBtn.cloneNode(true);
            addFriendBtn.parentNode.replaceChild(newAddFriendBtn, addFriendBtn);
            newAddFriendBtn.addEventListener('click', () => {
                if (this.friendsModal) this.friendsModal.hide();
                if (this.addFriendModal) {
                    setTimeout(() => this.addFriendModal.show(), 150);
                }
            });
        }
    }

    static updateFriendStatus(data) {
        if (data.type === 'initial_status' && Array.isArray(data.online_users)) {
            // Update all friends' status based on the initial status list
            const statusBadges = document.querySelectorAll('#friend-list-body [data-user-status]');
            statusBadges.forEach(badge => {
                const userId = parseInt(badge.getAttribute('data-user-status'));
                const isOnline = data.online_users.includes(userId);
                this.updateStatusBadge(badge, isOnline);
            });
        } else if (data.type === 'status_update') {
            // Update individual friend status
            const badge = document.querySelector(`#friend-list-body [data-user-status="${data.user_id}"]`);
            if (badge) {
                this.updateStatusBadge(badge, data.online_status);
            }
        }
    }

    static updateStatusBadge(badge, isOnline) {
        if (!badge) return;
        badge.style.backgroundColor = isOnline ? '#198754' : '#6c757d';
        badge.textContent = isOnline ? 'Online' : 'Offline';
    }

    static async fetchFriendList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/friends/`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching friend list:', error);
            UIManager.showToast('Failed to load friends list. Please try again later.', 'danger');
            return [];
        }
    }

    static async sendFriendRequest(username) {
        try {
            // First get the user's ID
            const searchResponse = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/?username=${encodeURIComponent(username)}`
            );

            if (!searchResponse.ok) {
                throw new Error('Failed to find user');
            }

            const users = await searchResponse.json();
            if (!users || users.length === 0) {
                throw new Error('User not found');
            }

            // Find the exact user match (case-sensitive)
            const userToAdd = users.find(user => user.username === username);
            if (!userToAdd) {
                throw new Error('User not found');
            }

            // Verify we're not trying to add ourselves
            if (userToAdd.id === AuthManager.currentUser.id) {
                throw new Error('Cannot add yourself as friend');
            }

            // Check if already friends by fetching current friends list
            const friendsResponse = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/friends/`);
            if (friendsResponse.ok) {
                const friendsList = await friendsResponse.json();
                if (friendsList.some(friend => friend.id === userToAdd.id)) {
                    throw new Error('Already friends with this user');
                }
            }

            // Send the friend request using the user's ID
            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/${userToAdd.id}/friend-request/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send friend request');
            }

            await this.updateFriendListUI();
            UIManager.showToast('Friend request sent successfully!', 'success');
            return true;
        } catch (error) {
            UIManager.showToast(error.message, 'danger');
            return false;
        }
    }

    static async removeFriend(friendId) {
        try {
            const response = await AuthManager.fetchWithAuth(
                `${AuthManager.API_BASE}users/${friendId}/unfriend/`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove friend');
            }

            await this.updateFriendListUI();
            UIManager.showToast('Friend removed successfully', 'success');
        } catch (error) {
            console.error('Remove friend error:', error);
            UIManager.showToast(error.message, 'danger');
        }
    }

    static async updateFriendListUI() {
        try {
            const friends = await this.fetchFriendList();
            const friendListBody = document.getElementById('friend-list-body');
            
            if (!friendListBody) {
                console.error('Friend list body element not found');
                return;
            }

            friendListBody.innerHTML = '';

            if (!Array.isArray(friends) || friends.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="3" class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-people fs-2"></i>
                            <p class="mt-2 text-light" data-i18n="noFriendsYet">No friends added yet</p>
                        </div>
                    </td>
                `;
                friendListBody.appendChild(emptyRow);
                LanguageManager.updateContent();
                return;
            }

            friends.forEach(friend => {
                const isOnline = ChatManager.onlineUsers.has(friend.id);
                const statusText = isOnline ? 
                    LanguageManager.getTranslation('online') : 
                    LanguageManager.getTranslation('offline');
                
                const row = document.createElement('tr');
                row.setAttribute('data-user-id', friend.id);
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${friend.avatar_url || '/media/avatars/default.svg'}" 
                                 alt="${friend.username}" 
                                 class="rounded-circle me-2"
                                 style="width: 24px; height: 24px;"
                                 onerror="this.src='/media/avatars/default.svg'">
                            <span class="friend-username">
                                ${friend.username}
                            </span>
                        </div>
                    </td>
                    <td>
                        <span class="badge" 
                              data-user-status="${friend.id}"
                              data-user-name="${friend.username}"
                              style="background-color: ${isOnline ? '#198754' : '#6c757d'}"
                              data-i18n="${isOnline ? 'online' : 'offline'}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="text-end friend-actions">
                        <button class="btn btn-sm btn-primary me-1 chat-btn" 
                                title="${LanguageManager.getTranslation('chat')} ${friend.username}">
                            <i class="bi bi-chat-dots"></i>
                            <span data-i18n="chat">Chat</span>
                        </button>
                        <button class="btn btn-sm btn-danger remove-friend" 
                                title="${LanguageManager.getTranslation('removeFriend')} ${friend.username}">
                            <i class="bi bi-person-x"></i>
                            <span data-i18n="removeFriend">Remove</span>
                        </button>
                    </td>
                `;

                // Add event listeners
                const chatBtn = row.querySelector('.chat-btn');
                chatBtn.addEventListener('click', () => {
                    if (this.friendsModal) {
                        this.friendsModal.hide();
                    }
                    ChatManager.startChat(friend.id, friend.username);
                });

                const removeBtn = row.querySelector('.remove-friend');
                removeBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const confirmMessage = LanguageManager.getTranslation('confirmRemoveFriend').replace('{username}', friend.username);
                    if (confirm(confirmMessage)) {
                        await this.removeFriend(friend.id);
                    }
                });

                friendListBody.appendChild(row);
            });

            // Update translations after adding new content
            LanguageManager.updateContent();
        } catch (error) {
            console.error('Error updating friend list UI:', error);
            UIManager.showToast('Failed to update friends list', 'danger');
        }
    }

    static async refreshFriendsList() {
        if (document.getElementById('friendsListModal').classList.contains('show')) {
            await this.updateFriendListUI();
        }
    }
} 