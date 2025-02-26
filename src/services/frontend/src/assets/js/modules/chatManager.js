import { AuthManager } from './authManager.js';
import { UIManager } from './uiManager.js';
import { Utils } from './utils.js';
import { UserManager } from './userManager.js';
import { FriendManager } from './friendManager.js';

export class ChatManager {
    static chatSocket = null;
    static statusSocket = null;
    static currentChatPartner = null;
    static reconnectAttempts = 0;
    static reconnectTimeout = null;
    static MAX_RECONNECT_ATTEMPTS = 5;
    static RECONNECT_DELAY = 5000;
    static isConnecting = false;
    static blockedUsers = new Set();
    static onlineUsers = new Set();

    static initStatusWebSocket() {
        // If already connecting or connected, don't try to connect again
        if (this.isConnecting || (this.statusSocket && this.statusSocket.readyState === WebSocket.OPEN)) {
            return;
        }

        // Don't attempt connection if there's no access token
        if (!AuthManager.accessToken) {
            console.log('No access token available, skipping WebSocket connection');
            return;
        }

        try {
            this.isConnecting = true;
            const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${wsScheme}://${window.location.host}/ws/status/?token=${encodeURIComponent(AuthManager.accessToken)}`;
            
            if (this.statusSocket) {
                this.statusSocket.close();
                this.statusSocket = null;
            }

            this.statusSocket = new WebSocket(wsUrl);
            
            this.statusSocket.onopen = () => {
                console.log('Status WebSocket connected successfully');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                // Request initial status immediately after connection
                this.statusSocket.send(JSON.stringify({ type: 'get_status' }));
            };
            
            this.statusSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'initial_status' && Array.isArray(data.online_users)) {
                        // Clear and update online users set
                        this.onlineUsers.clear();
                        data.online_users.forEach(id => this.onlineUsers.add(parseInt(id)));
                        
                        // Update all status badges
                        document.querySelectorAll('[data-user-status]').forEach(badge => {
                            const userId = parseInt(badge.getAttribute('data-user-status'));
                            const isOnline = this.onlineUsers.has(userId);
                            this.updateStatusBadge(badge, isOnline);
                        });
                    } else if (data.type === 'status_update') {
                        const userId = parseInt(data.user_id);
                        if (data.online_status) {
                            this.onlineUsers.add(userId);
                        } else {
                            this.onlineUsers.delete(userId);
                        }
                        
                        // Update status badges for this user
                        document.querySelectorAll(`[data-user-status="${userId}"]`).forEach(badge => {
                            this.updateStatusBadge(badge, data.online_status);
                        });
                    }

                    // Refresh lists to ensure UI is up to date
                    if (window.UserManager) UserManager.refreshUsersList();
                    if (window.FriendManager) FriendManager.refreshFriendsList();
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };

            this.statusSocket.onclose = (event) => {
                console.log('Status WebSocket disconnected:', event.code, event.reason);
                this.isConnecting = false;

                if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                    this.reconnectAttempts++;
                    console.log(`Reconnect attempt ${this.reconnectAttempts} of ${this.MAX_RECONNECT_ATTEMPTS}`);
                    
                    if (this.reconnectTimeout) {
                        clearTimeout(this.reconnectTimeout);
                    }
                    
                    this.reconnectTimeout = setTimeout(() => {
                        if (AuthManager.accessToken) {
                            this.initStatusWebSocket();
                        }
                    }, this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1));
                } else {
                    console.log('Maximum reconnection attempts reached');
                }
            };

            this.statusSocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            };
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
            this.isConnecting = false;
        }
    }

    static cleanup() {
        this.isConnecting = false;
        clearTimeout(this.reconnectTimeout);
        this.reconnectAttempts = 0;
        this.currentChatPartner = null;
        
        if (this.statusSocket) {
            this.statusSocket.close();
            this.statusSocket = null;
        }
        if (this.chatSocket) {
            this.chatSocket.close();
            this.chatSocket = null;
        }
    }

    static updateStatusBadge(badge, isOnline) {
        if (badge) {
            const userId = parseInt(badge.getAttribute('data-user-status'));
            if (isOnline) {
                this.onlineUsers.add(userId);
            } else {
                this.onlineUsers.delete(userId);
            }
            badge.className = `badge ${isOnline ? 'bg-success' : 'bg-secondary'}`;
            badge.textContent = isOnline ? 'Online' : 'Offline';
        }
    }

    static initializeEventListeners() {
        document.getElementById('toggle-chat')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatContainer = document.getElementById('chat-container');
            const chatBody = chatContainer.querySelector('.card-body');
            const icon = document.querySelector('#toggle-chat i');
            
            if (chatBody.style.display !== 'none') {
                chatBody.style.display = 'none';
                icon.className = 'bi bi-chevron-up';
                chatContainer.style.transform = 'translateY(calc(100% - 38px))';
            } else {
                chatBody.style.display = 'block';
                icon.className = 'bi bi-dash-lg';
                chatContainer.style.transform = 'none';
            }
        });

        document.getElementById('close-chat')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatContainer = document.getElementById('chat-container');
            chatContainer.style.display = 'none';
            
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            this.currentChatPartner = null;
            if (this.chatSocket) {
                this.chatSocket.close();
                this.chatSocket = null;
            }
        });

        // Add send message event listener
        document.getElementById('send-button')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Add enter key event listener for message input
        document.getElementById('message-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    static async startChat(userId, username) {
        if (!userId || !username) {
            console.error('Invalid user data for chat');
            UIManager.showToast('Unable to start chat: Invalid user data', 'danger');
            return;
        }

        const userRow = document.querySelector(`[data-user-id="${userId}"]`);
        if (userRow?.classList.contains('blocked-user')) {
            UIManager.showToast('Cannot chat with blocked user', 'warning');
            return;
        }
        
        this.currentChatPartner = { id: userId, username };
        this.reconnectAttempts = 0;
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Show chat container
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.display = 'block';

        // Update chat header
        const chatHeader = document.getElementById('chat-header');
        const statusBadge = document.querySelector(`[data-user-status="${userId}"]`);
        const isOnline = statusBadge?.classList.contains('bg-success');
        const isBlocked = userRow?.classList.contains('blocked-user');
        
        chatHeader.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <span>Chat with ${username}</span>
                <div>
                    <button id="block-user" class="btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'} me-2">
                        <i class="bi bi-slash-circle"></i>
                    </button>
                    <button id="toggle-chat" class="btn btn-sm btn-outline-light">
                        <i class="bi bi-dash-lg"></i>
                    </button>
                    <button id="close-chat" class="btn btn-sm btn-outline-light">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `;

        // Load previous messages
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/messages/${userId}/`);
            if (!response.ok) throw new Error('Failed to load messages');
            
            const messages = await response.json();
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.innerHTML = '';
            
            messages.forEach(msg => {
                const messageElement = this.createChatMessage(msg);
                messagesContainer.appendChild(messageElement);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Error loading messages:', error);
            UIManager.showToast('Failed to load previous messages', 'danger');
        }

        // Close existing WebSocket if any
        if (this.chatSocket) {
            this.chatSocket.close();
        }

        // Establish new WebSocket connection with correct URL pattern
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const currentUserId = AuthManager.currentUser.id;
        // Sort user IDs to match backend's room name creation
        const [user1Id, user2Id] = [currentUserId, userId].sort((a, b) => a - b);
        const wsUrl = `${wsScheme}://${window.location.host}/ws/chat/${user1Id}/${user2Id}/?token=${encodeURIComponent(AuthManager.accessToken)}`;
        
        this.chatSocket = new WebSocket(wsUrl);
        
        this.chatSocket.onmessage = this.handleChatMessage.bind(this);
        this.chatSocket.onclose = this.handleChatClose.bind(this);

        // Reattach event listeners
        this.initializeEventListeners();
    }

    static createChatMessage(message) {
        const messageDiv = document.createElement('div');
        
        // Handle different message object structures with more detailed logging
        const senderId = message.sender?.id || message.sender_id;
        const senderUsername = message.sender?.username || message.sender_display_name || message.username;
        const senderAvatarUrl = message.sender?.avatar_url || message.sender_avatar_url || '/media/avatars/default.svg';
        const messageTimestamp = message.timestamp || new Date().toISOString();
        const messageContent = message.message || message.content;

        console.log('Creating message with:', {
            senderId,
            senderUsername,
            messageContent,
            messageTimestamp
        });
        
        const isSentMessage = senderId === AuthManager.currentUser?.id;
        
        messageDiv.className = `message-wrapper d-flex align-items-start mb-2 ${isSentMessage ? 'sent justify-content-end' : 'received'}`;
        
        messageDiv.innerHTML = `
            <img src="${senderAvatarUrl}" 
                 alt="${senderUsername}" 
                 class="avatar"
                 onerror="this.src='/media/avatars/default.svg'">
            <div class="message-content">
                <div class="message-header mb-1">
                    <span class="message-username" style="cursor: pointer; text-decoration: underline;">
                        ${senderUsername}
                    </span>
                    <small class="text-muted ms-2">
                        ${new Date(messageTimestamp).toLocaleTimeString()}
                    </small>
                </div>
                <div class="list-group-item ${isSentMessage ? 'sent-message' : 'received-message'}">
                    ${Utils.escapeHtml(messageContent)}
                </div>
            </div>
        `;

        // Make username clickable
        const usernameElement = messageDiv.querySelector('.message-username');
        if (usernameElement) {
            UIManager.makeUsernameClickable(
                usernameElement,
                senderId,
                senderUsername
            );
        }
        
        return messageDiv;
    }

    static handleChatMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message data:', data);
            
            if (data.type === 'chat_message') {
                const messagesContainer = document.getElementById('chat-messages');
                const messageElement = this.createChatMessage({
                    sender_id: data.sender_id,
                    username: data.sender_display_name,
                    sender_avatar_url: data.sender_avatar_url,
                    message: data.content || data.message,
                    timestamp: data.timestamp || new Date().toISOString()
                });
                
                messagesContainer.appendChild(messageElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else if (data.type === 'chat_history') {
                // Handle chat history if sent by the server
                const messagesContainer = document.getElementById('chat-messages');
                messagesContainer.innerHTML = '';
                
                data.messages.forEach(msg => {
                    const messageElement = this.createChatMessage(msg);
                    messagesContainer.appendChild(messageElement);
                });
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Error handling chat message:', error, event.data);
        }
    }

    static handleChatClose() {
        if (this.currentChatPartner && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectAttempts++;
                if (this.currentChatPartner) {
                    this.startChat(this.currentChatPartner.id, this.currentChatPartner.username);
                }
            }, 5000);
        } else {
            this.reconnectAttempts = 0;
            this.currentChatPartner = null;
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        }
    }

    static sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (message && this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
            // Only send through WebSocket, don't create local message
            // The message will be displayed when received back from the server
            this.chatSocket.send(JSON.stringify({
                message: message,
                recipient: this.currentChatPartner.id
            }));
            
            // Clear input after sending
            input.value = '';
        }
    }

    static async blockUser(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/block/${userId}/`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to block user');
            
            this.updateBlockedStatus(userId, true);
            UIManager.showToast('User blocked successfully', 'success');
            
            if (this.currentChatPartner?.id === userId) {
                document.getElementById('close-chat').click();
            }

            return true;
        } catch (error) {
            console.error('Error blocking user:', error);
            UIManager.showToast('Failed to block user', 'danger');
            return false;
        }
    }

    static async unblockUser(userId) {
        try {
            const response = await AuthManager.fetchWithAuth(`${AuthManager.API_BASE}users/unblock/${userId}/`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to unblock user');
            
            this.updateBlockedStatus(userId, false);
            UIManager.showToast('User unblocked successfully', 'success');

            return true;
        } catch (error) {
            console.error('Error unblocking user:', error);
            UIManager.showToast('Failed to unblock user', 'danger');
            return false;
        }
    }

    static updateBlockedStatus(userId, isBlocked) {
        const userRow = document.querySelector(`[data-user-id="${userId}"]`);
        if (userRow) {
            const chatBtn = userRow.querySelector('.chat-btn');
            const blockBtn = userRow.querySelector('.block-btn');
            const statusBadge = userRow.querySelector(`[data-user-status="${userId}"]`);
            const wasOnline = statusBadge?.classList.contains('bg-success');
            
            if (isBlocked) {
                userRow.classList.add('blocked-user');
                chatBtn.disabled = true;
                blockBtn.textContent = 'Unblock';
                blockBtn.classList.replace('btn-danger', 'btn-secondary');
            } else {
                userRow.classList.remove('blocked-user');
                chatBtn.disabled = false;
                blockBtn.textContent = 'Block';
                blockBtn.classList.replace('btn-secondary', 'btn-danger');
            }

            if (statusBadge) {
                statusBadge.className = `badge ${wasOnline ? 'bg-success' : 'bg-secondary'}`;
                statusBadge.textContent = wasOnline ? 'Online' : 'Offline';
            }

            if (this.currentChatPartner?.id === userId) {
                const chatHeader = document.getElementById('chat-header');
                if (chatHeader) {
                    const blockButton = chatHeader.querySelector('#block-user');
                    if (blockButton) {
                        blockButton.className = `btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'} me-2`;
                    }
                }
            }
        }
    }

    static closeChat() {
        if (this.chatSocket) {
            this.chatSocket.close();
            this.chatSocket = null;
        }
        this.currentChatPartner = null;
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        document.getElementById('chat-container').style.display = 'none';
    }
} 