import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { ChatManager } from './chatManager.js';

export class FriendManager {
    static async refreshFriendsList() {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}friends/`);
            if (!response.ok) throw new Error('Failed to fetch friends list');

            const friends = await response.json();
            const tableBody = document.getElementById('friend-list-body');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            if (friends.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center">
                            No friends yet. Add some friends to play with!
                        </td>
                    </tr>
                `;
                return;
            }

            friends.forEach(friend => {
                const row = document.createElement('tr');
                const isOnline = ChatManager.onlineUsers.has(friend.id);
                
                row.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${friend.avatar_url || '/media/avatars/default.svg'}" 
                                 alt="${friend.username}"
                                 class="rounded-circle me-2"
                                 style="width: 32px; height: 32px;"
                                 onerror="this.src='/media/avatars/default.svg'">
                            <span class="username" style="cursor: pointer; text-decoration: underline;">
                                ${friend.username}
                            </span>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${isOnline ? 'bg-success' : 'bg-secondary'}" 
                              data-user-status="${friend.id}">
                            ${isOnline ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td class="text-end">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary chat-btn">
                                Chat
                            </button>
                            <button class="btn btn-sm btn-success invite-btn" ${!isOnline ? 'disabled' : ''}>
                                Invite
                            </button>
                            <button class="btn btn-sm btn-danger remove-friend-btn">
                                Remove
                            </button>
                        </div>
                    </td>
                `;

                // Make username clickable
                const usernameElement = row.querySelector('.username');
                UIManager.makeUsernameClickable(usernameElement, friend.id, friend.username);

                // Add chat button handler
                const chatBtn = row.querySelector('.chat-btn');
                chatBtn.addEventListener('click', () => {
                    ChatManager.startChat(friend.id, friend.username);
                });

                // Add invite button handler
                const inviteBtn = row.querySelector('.invite-btn');
                inviteBtn.addEventListener('click', () => {
                    this.showGameInviteModal(friend);
                });

                // Add remove friend button handler
                const removeBtn = row.querySelector('.remove-friend-btn');
                removeBtn.addEventListener('click', async () => {
                    if (await this.confirmRemoveFriend(friend.username)) {
                        await this.removeFriend(friend.id);
                    }
                });

                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error refreshing friends list:', error);
            UIManager.showToast('Failed to load friends list', 'danger');
        }
    }

    static async addFriend(username) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}friends/add/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to add friend');
            }

            UIManager.showToast('Friend request sent successfully', 'success');
            await this.refreshFriendsList();
            return true;
        } catch (error) {
            console.error('Error adding friend:', error);
            UIManager.showToast(error.message || 'Failed to add friend', 'danger');
            return false;
        }
    }

    static async removeFriend(friendId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}friends/remove/${friendId}/`, {
                method: 'POST'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove friend');
            }

            UIManager.showToast('Friend removed successfully', 'success');
            await this.refreshFriendsList();
            return true;
        } catch (error) {
            console.error('Error removing friend:', error);
            UIManager.showToast(error.message || 'Failed to remove friend', 'danger');
            return false;
        }
    }

    static async confirmRemoveFriend(username) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header">
                            <h5 class="modal-title">Remove Friend</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            Are you sure you want to remove ${username} from your friends list?
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirm-remove">Remove</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            const modalInstance = new bootstrap.Modal(modal);
            
            modal.querySelector('#confirm-remove').addEventListener('click', () => {
                modalInstance.hide();
                resolve(true);
            });

            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(false);
            });

            modalInstance.show();
        });
    }

    static showGameInviteModal(friend) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content bg-dark text-light">
                    <div class="modal-header">
                        <h5 class="modal-title">Invite ${friend.username}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group">
                            <button class="list-group-item list-group-item-action bg-dark text-light" data-game="pong">
                                Classic Pong
                            </button>
                            <button class="list-group-item list-group-item-action bg-dark text-light" data-game="territory">
                                Territory Game
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);

        // Add click handlers for game options
        modal.querySelectorAll('.list-group-item').forEach(button => {
            button.addEventListener('click', () => {
                const gameType = button.getAttribute('data-game');
                this.sendGameInvite(friend.id, gameType);
                modalInstance.hide();
            });
        });

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        modalInstance.show();
    }

    static async sendGameInvite(friendId, gameType) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}game/invite/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_id: friendId, game_type: gameType })
            });

            if (!response.ok) throw new Error('Failed to send game invite');

            UIManager.showToast('Game invitation sent!', 'success');
        } catch (error) {
            console.error('Error sending game invite:', error);
            UIManager.showToast('Failed to send game invite', 'danger');
        }
    }

    static initializeEventListeners() {
        // Add friend form handler
        const addFriendForm = document.getElementById('add-friend-form');
        if (addFriendForm) {
            addFriendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('friend-username').value.trim();
                if (username) {
                    const success = await this.addFriend(username);
                    if (success) {
                        addFriendForm.reset();
                        bootstrap.Modal.getInstance(document.getElementById('addFriendModal')).hide();
                    }
                }
            });
        }
    }
} 