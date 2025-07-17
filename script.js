// Initialize socket connection
const socket = io();

// DOM elements
const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const chatContainer = document.getElementById('chat-container');
const currentUserSpan = document.getElementById('current-user');
const onlineCountSpan = document.getElementById('online-count');
const onlineUsersList = document.getElementById('online-users-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// New elements
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const fileBtn = document.getElementById('file-btn');
const imageBtn = document.getElementById('image-btn');
const voiceCallBtn = document.getElementById('voice-call-btn');
const fileInput = document.getElementById('file-input');
const imageInput = document.getElementById('image-input');
const voiceCallModal = document.getElementById('voice-call-modal');
const callStatus = document.getElementById('call-status');
const callUser = document.getElementById('call-user');
const muteBtn = document.getElementById('mute-btn');
const endCallBtn = document.getElementById('end-call-btn');
const callDuration = document.getElementById('call-duration');

// State
let currentUsername = '';
let typingTimer;
let isTyping = false;
let currentTheme = localStorage.getItem('theme') || 'light';
let isInCall = false;
let callStartTime = null;
let callTimer = null;
let isMuted = false;
let mediaStream = null;

// Initialize the app
function init() {
    // Set initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    
    // Focus on username input
    usernameInput.focus();
    
    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Username input
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinChat();
        }
    });
    
    joinBtn.addEventListener('click', joinChat);
    
    // Message input
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        } else {
            handleTyping();
        }
    });
    
    messageInput.addEventListener('input', handleTyping);
    sendBtn.addEventListener('click', sendMessage);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Sidebar controls
    sidebarToggle.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // File sharing
    fileBtn.addEventListener('click', () => fileInput.click());
    imageBtn.addEventListener('click', () => imageInput.click());
    fileInput.addEventListener('change', handleFileShare);
    imageInput.addEventListener('change', handleImageShare);
    
    // Voice call
    voiceCallBtn.addEventListener('click', toggleVoiceCall);
    muteBtn.addEventListener('click', toggleMute);
    endCallBtn.addEventListener('click', endCall);
    
    // Close sidebar on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
}

// Theme functions
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Sidebar functions
function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

// Join chat function
function joinChat() {
    const username = usernameInput.value.trim();
    
    if (username.length < 2) {
        alert('Please enter a name with at least 2 characters');
        return;
    }
    
    if (username.length > 20) {
        alert('Name must be 20 characters or less');
        return;
    }
    
    currentUsername = username;
    currentUserSpan.textContent = username;
    
    // Hide modal and show chat
    usernameModal.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    
    // Focus on message input
    messageInput.focus();
    
    // Emit user joined event
    socket.emit('user-joined', username);
}

// Send message function
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (message === '') return;
    
    // Emit message
    socket.emit('chat-message', { message });
    
    // Clear input
    messageInput.value = '';
    
    // Stop typing indicator
    if (isTyping) {
        socket.emit('typing', { isTyping: false });
        isTyping = false;
    }
}

// Handle typing indicator
function handleTyping() {
    if (!isTyping) {
        socket.emit('typing', { isTyping: true });
        isTyping = true;
    }
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit('typing', { isTyping: false });
        isTyping = false;
    }, 1000);
}

// File sharing functions
function handleFileShare(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = {
            name: file.name,
            size: file.size,
            type: file.type,
            data: e.target.result
        };
        
        socket.emit('file-share', fileData);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    fileInput.value = '';
}

function handleImageShare(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit for images
        alert('Image size must be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = {
            name: file.name,
            size: file.size,
            type: file.type,
            data: e.target.result
        };
        
        socket.emit('image-share', imageData);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    imageInput.value = '';
}

// Voice call functions
async function toggleVoiceCall() {
    if (isInCall) {
        endCall();
    } else {
        startCall();
    }
}

async function startCall() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isInCall = true;
        voiceCallBtn.classList.add('active');
        voiceCallModal.classList.remove('hidden');
        callStatus.textContent = 'In Call';
        callUser.textContent = 'Group Voice Call';
        
        // Start call timer
        callStartTime = Date.now();
        callTimer = setInterval(updateCallDuration, 1000);
        
        // Emit call start
        socket.emit('voice-call-start');
        
    } catch (error) {
        alert('Could not access microphone. Please check permissions.');
        console.error('Error accessing microphone:', error);
    }
}

function endCall() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    isInCall = false;
    voiceCallBtn.classList.remove('active');
    voiceCallModal.classList.add('hidden');
    
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    callDuration.textContent = '00:00';
    isMuted = false;
    updateMuteButton();
    
    // Emit call end
    socket.emit('voice-call-end');
}

function toggleMute() {
    if (!mediaStream) return;
    
    isMuted = !isMuted;
    mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
    
    updateMuteButton();
    socket.emit('voice-call-mute', { isMuted });
}

function updateMuteButton() {
    const icon = muteBtn.querySelector('i');
    icon.className = isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
    muteBtn.style.background = isMuted ? '#dc3545' : '#28a745';
}

function updateCallDuration() {
    if (!callStartTime) return;
    
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    callDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Display message in chat
function displayMessage(data, type = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    if (type === 'system') {
        messageDiv.className = 'system-message';
        messageDiv.textContent = data.message;
    } else if (type === 'file') {
        // Check if it's own message
        if (data.userId === socket.id) {
            messageDiv.classList.add('own');
        }
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const fileSize = formatFileSize(data.file.size);
        const fileIcon = getFileIcon(data.file.type);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">${data.username} • ${timestamp}</div>
                <div class="file-message">
                    <i class="${fileIcon} file-icon"></i>
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(data.file.name)}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    <a href="${data.file.data}" download="${data.file.name}" class="file-download">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            </div>
        `;
    } else if (type === 'image') {
        // Check if it's own message
        if (data.userId === socket.id) {
            messageDiv.classList.add('own');
        }
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">${data.username} • ${timestamp}</div>
                <div class="image-message">
                    <img src="${data.image.data}" alt="${escapeHtml(data.image.name)}" onclick="openImageModal(this.src)">
                </div>
            </div>
        `;
    } else {
        // Check if it's own message
        if (data.userId === socket.id) {
            messageDiv.classList.add('own');
        }
        
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">${data.username} • ${timestamp}</div>
                <div class="message-text">${escapeHtml(data.message)}</div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fas fa-image';
    if (fileType.startsWith('video/')) return 'fas fa-video';
    if (fileType.startsWith('audio/')) return 'fas fa-music';
    if (fileType.includes('pdf')) return 'fas fa-file-pdf';
    if (fileType.includes('word')) return 'fas fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fas fa-file-powerpoint';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'fas fa-file-archive';
    return 'fas fa-file';
}

function openImageModal(src) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%; padding: 0; background: transparent;">
            <img src="${src}" style="width: 100%; height: auto; border-radius: 8px;">
        </div>
    `;
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.body.appendChild(modal);
}

// Update online users list
function updateOnlineUsers(users) {
    onlineUsersList.innerHTML = '';
    
    users.forEach(username => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.textContent = username;
        
        // Highlight current user
        if (username === currentUsername) {
            userDiv.style.fontWeight = 'bold';
            userDiv.style.borderLeftColor = '#007bff';
        }
        
        onlineUsersList.appendChild(userDiv);
    });
}

// Update typing indicator
function updateTypingIndicator(typingUsers) {
    if (typingUsers.length === 0) {
        typingIndicator.classList.add('hidden');
        return;
    }
    
    typingIndicator.classList.remove('hidden');
    
    if (typingUsers.length === 1) {
        typingIndicator.innerHTML = `<i class="fas fa-typing"></i> ${typingUsers[0]} is typing...`;
    } else if (typingUsers.length === 2) {
        typingIndicator.innerHTML = `<i class="fas fa-typing"></i> ${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else {
        typingIndicator.innerHTML = `<i class="fas fa-typing"></i> ${typingUsers.length} people are typing...`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Socket event listeners
socket.on('chat-message', (data) => {
    displayMessage(data);
});

socket.on('file-share', (data) => {
    displayMessage(data, 'file');
});

socket.on('image-share', (data) => {
    displayMessage(data, 'image');
});

socket.on('user-connected', (data) => {
    displayMessage(data, 'system');
});

socket.on('user-disconnected', (data) => {
    displayMessage(data, 'system');
});

socket.on('online-users', (users) => {
    updateOnlineUsers(users);
});

socket.on('users-count', (count) => {
    onlineCountSpan.textContent = `${count} online`;
});

socket.on('voice-call-notification', (data) => {
    displayMessage({
        message: `${data.username} ${data.action === 'start' ? 'started' : 'ended'} a voice call`,
        timestamp: new Date()
    }, 'system');
});

// Handle typing indicators
let currentlyTyping = [];

socket.on('user-typing', (data) => {
    if (data.isTyping) {
        if (!currentlyTyping.includes(data.username)) {
            currentlyTyping.push(data.username);
        }
    } else {
        currentlyTyping = currentlyTyping.filter(user => user !== data.username);
    }
    
    updateTypingIndicator(currentlyTyping);
});

// Handle connection errors
socket.on('connect_error', () => {
    alert('Connection failed. Please refresh the page and try again.');
});

socket.on('disconnect', () => {
    alert('Connection lost. Please refresh the page to reconnect.');
    if (isInCall) {
        endCall();
    }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);