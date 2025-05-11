// Initialize socket connection
const socket = io();

// App state
const state = {
  username: '',
  profilePic: '',
  status: 'Online',
  darkMode: false,
  users: [],
  unreadMessages: 0,
  isAtBottom: true,
  typingTimeout: null,
  isTyping: false
};

// DOM Elements
const usernamePrompt = document.getElementById('username-prompt');
const chatContainer = document.getElementById('chat-container');
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const usernameInput = document.getElementById('username-input');
const profilePicInput = document.getElementById('profile-pic-input');
const statusInput = document.getElementById('status-input');
const setUsernameBtn = document.getElementById('set-username');
const newMessagesNotification = document.getElementById('new-messages-notification');
const onlineUsersList = document.getElementById('online-users-list');
const onlineCount = document.getElementById('online-count');
const activeNow = document.getElementById('active-now');
const currentUsername = document.getElementById('current-username');
const currentStatus = document.getElementById('current-status');
const userAvatar = document.getElementById('user-avatar');
const userStatusIndicator = document.getElementById('user-status-indicator');
const typingIndicator = document.getElementById('typing-indicator');
const toggleThemeBtn = document.getElementById('toggle-theme');
const clearChatBtn = document.getElementById('clear-chat');
const emojiButton = document.getElementById('emoji-button');
const emojiPicker = document.getElementById('emoji-picker');
const attachButton = document.getElementById('attach-button');
const editProfileBtn = document.getElementById('edit-profile');
const profileModal = document.getElementById('profile-modal');
const closeModalBtn = document.getElementById('close-modal');
const editUsername = document.getElementById('edit-username');
const editProfilePic = document.getElementById('edit-profile-pic');
const editStatus = document.getElementById('edit-status');
const saveProfileBtn = document.getElementById('save-profile');
const avatarPreviewImg = document.getElementById('avatar-preview-img');
const editAvatarPreview = document.getElementById('edit-avatar-preview');

// Default avatar URL
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random&name=';

// Initialize the application
function init() {
  setupEventListeners();
  initializeEmojiPicker();
  checkUserLogin();
}

// Set up all event listeners
function setupEventListeners() {
  // Form submission
  form.addEventListener('submit', handleMessageSubmit);
  
  // Set username button
  setUsernameBtn.addEventListener('click', handleUserLogin);
  
  // Input keydown for typing indicator
  input.addEventListener('input', handleTyping);
  
  // Profile pic input change for preview
  profilePicInput.addEventListener('input', () => {
    updateAvatarPreview(profilePicInput.value, avatarPreviewImg);
  });
  
  // Edit profile pic input change for preview
  editProfilePic.addEventListener('input', () => {
    updateAvatarPreview(editProfilePic.value, editAvatarPreview);
  });
  
  // Toggle theme button
  toggleThemeBtn.addEventListener('click', toggleDarkMode);
  
  // Clear chat button
  clearChatBtn.addEventListener('click', clearMessages);
  
  // New messages notification click
  newMessagesNotification.addEventListener('click', scrollToBottom);
  
  // Chat messages container scroll
  messages.parentElement.addEventListener('scroll', handleScroll);
  
  // Emoji button
  emojiButton.addEventListener('click', toggleEmojiPicker);
  
  // Attach button
  attachButton.addEventListener('click', handleAttachment);
  
  // Edit profile button
  editProfileBtn.addEventListener('click', openProfileModal);
  
  // Close modal button
  closeModalBtn.addEventListener('click', closeProfileModal);
  
  // Save profile button
  saveProfileBtn.addEventListener('click', saveProfileChanges);
  
  // Click outside emoji picker to close it
  document.addEventListener('click', (e) => {
    if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
      emojiPicker.style.display = 'none';
    }
  });
  
  // Socket events
  socket.on('chat message', handleIncomingMessage);
  socket.on('user joined', handleUserJoined);
  socket.on('user left', handleUserLeft);
  socket.on('update users', updateUsersList);
  socket.on('typing', handleUserTyping);
  socket.on('stop typing', handleUserStopTyping);
}

// Initialize emoji picker
function initializeEmojiPicker() {
  const commonEmojis = ['😊', '😂', '🥰', '👍', '❤️', '😍', '🔥', '😁', '😎', '🙌', '👏', '🤔', '😢', '🎉', '👀', '👋', '🙏', '🤣', '😉', '🤷‍♂️'];
  
  const emojiContainer = document.createElement('div');
  emojiContainer.className = 'emoji-container';
  
  commonEmojis.forEach(emoji => {
    const emojiButton = document.createElement('button');
    emojiButton.className = 'emoji-item';
    emojiButton.textContent = emoji;
    emojiButton.addEventListener('click', () => {
      input.value += emoji;
      input.focus();
    });
    emojiContainer.appendChild(emojiButton);
  });
  
  emojiPicker.appendChild(emojiContainer);
  
  // Apply styles to emoji container
  const style = document.createElement('style');
  style.textContent = `
    .emoji-container {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .emoji-item {
      font-size: 24px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 4px;
      padding: 8px;
      transition: all 0.2s ease;
    }
    .emoji-item:hover {
      background-color: #f0f0f0;
      transform: scale(1.2);
    }
  `;
  document.head.appendChild(style);
}

// Check if user is already logged in
function checkUserLogin() {
  const savedUser = localStorage.getItem('chatUser');
  if (savedUser) {
    const userData = JSON.parse(savedUser);
    state.username = userData.username;
    state.profilePic = userData.profilePic;
    state.status = userData.status;
    
    // Restore dark mode if previously enabled
    if (localStorage.getItem('darkMode') === 'true') {
      toggleDarkMode();
    }
    
    completeLogin();
  }
}

// Handle user login
function handleUserLogin() {
  const username = usernameInput.value.trim();
  const profilePic = profilePicInput.value.trim();
  const status = statusInput.value;
  
  if (!username) {
    shakeElement(usernameInput);
    return;
  }
  
  state.username = username;
  state.profilePic = profilePic || `${DEFAULT_AVATAR}${encodeURIComponent(username)}`;
  state.status = status;
  
  // Save user data to local storage
  saveUserData();
  
  completeLogin();
}

// Complete the login process
function completeLogin() {
  // Update UI
  usernamePrompt.style.display = 'none';
  chatContainer.style.display = 'flex';
  currentUsername.textContent = state.username;
  currentStatus.textContent = state.status;
  updateAvatarDisplay();
  
  // Connect to chat
  socket.emit('set username', {
  username: state.username,
  profilePic: state.profilePic,
  status: state.status
});
  
  // Add welcome message
  addSystemMessage(`Welcome to Chat Hub, ${state.username}!`);
  
  // Scroll to bottom
  setTimeout(scrollToBottom, 100);
}

// Save user data to local storage
function saveUserData() {
  localStorage.setItem('chatUser', JSON.stringify({
    username: state.username,
    profilePic: state.profilePic,
    status: state.status
  }));
}

// Update avatar display throughout the app
function updateAvatarDisplay() {
  userAvatar.src = state.profilePic;
  userStatusIndicator.className = `status-indicator ${state.status.toLowerCase()}`;
}

// Update avatar preview when URL changes
function updateAvatarPreview(url, imgElement) {
  if (url && url.trim()) {
    imgElement.src = url;
  } else {
    imgElement.src = state.username ? 
      `${DEFAULT_AVATAR}${encodeURIComponent(state.username)}` : 
      '/api/placeholder/80/80';
  }
  
  // Handle image load errors
  imgElement.onerror = () => {
    imgElement.src = state.username ? 
      `${DEFAULT_AVATAR}${encodeURIComponent(state.username)}` : 
      '/api/placeholder/80/80';
  };
}

// Handle form submission
function handleMessageSubmit(e) {
  e.preventDefault();
  const message = input.value.trim();
  
  if (message) {
    // Send message to server
    socket.emit('chat message', {
      text: message,
      username: state.username,
      profilePic: state.profilePic,
      timestamp: new Date().toISOString()
    });
    
    // Clear input
    input.value = '';
    input.focus();
    
    // Stop typing indicator
    stopTyping();
  }
}

// Handle incoming messages
function handleIncomingMessage(msg) {
  const isOwnMessage = msg.username === state.username;
  
  // Create message element
  const li = document.createElement('li');
  li.className = `message-item ${isOwnMessage ? 'own-message' : ''}`;
  
  // Add avatar
  const avatar = document.createElement('img');
  avatar.src = msg.profilePic;
  avatar.className = 'message-avatar';
  avatar.onerror = () => {
    avatar.src = `${DEFAULT_AVATAR}${encodeURIComponent(msg.username)}`;
  };
  li.appendChild(avatar);
  
  // Message content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Message bubble
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  
  // Message header with username and timestamp
  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';
  
  const author = document.createElement('span');
  author.className = 'message-author';
  author.textContent = isOwnMessage ? 'You' : msg.username;
  headerDiv.appendChild(author);
  
  const timestamp = document.createElement('span');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = formatTime(new Date(msg.timestamp));
  headerDiv.appendChild(timestamp);
  
  bubbleDiv.appendChild(headerDiv);
  
  // Message text
  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = msg.text;
  bubbleDiv.appendChild(textDiv);
  
  contentDiv.appendChild(bubbleDiv);
  li.appendChild(contentDiv);
  
  // Add message to list
  messages.appendChild(li);
  
  // Update notification if not at bottom
  if (!state.isAtBottom && !isOwnMessage) {
    state.unreadMessages++;
    updateNewMessageNotification();
  } else if (isOwnMessage) {
    // Always scroll to bottom for own messages
    scrollToBottom();
  } else {
    // Check if we should auto-scroll
    const shouldScroll = 
      messages.scrollHeight - messages.parentElement.scrollTop - 
      messages.parentElement.clientHeight < 100;
    
    if (shouldScroll) {
      scrollToBottom();
    }
  }
}

// Add system message
function addSystemMessage(text) {
  const li = document.createElement('li');
  li.className = 'message-item system-message';
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'system-bubble';
  bubbleDiv.textContent = text;
  
  li.appendChild(bubbleDiv);
  messages.appendChild(li);
  
  // Apply styles to system message
  const style = document.createElement('style');
  style.textContent = `
    .system-message {
      justify-content: center;
      margin: 8px 0;
    }
    .system-bubble {
      background-color: rgba(0, 0, 0, 0.05);
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      color: var(--gray-600);
    }
  `;
  document.head.appendChild(style);
}

// Format timestamp
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Handle user joined event
function handleUserJoined(user) {
  if (user.username !== state.username) {
    addSystemMessage(`${user.username} has joined the chat`);
    updateUserCount();
  }
}

// Handle user left event
function handleUserLeft(user) {
  addSystemMessage(`${user.username} has left the chat`);
  updateUserCount();
}

// Update users list
function updateUsersList(users) {
  state.users = users;
  updateUserCount();
  
  // Clear current list
  onlineUsersList.innerHTML = '';
  
  // Add users to list
  users.forEach(user => {
    if (user.username !== state.username) {
      const li = document.createElement('li');
      li.className = 'user-item';
      
      const img = document.createElement('img');
      img.src = user.profilePic;
      img.onerror = () => {
        img.src = `${DEFAULT_AVATAR}${encodeURIComponent(user.username)}`;
      };
      li.appendChild(img);
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'user-item-info';
      
      const name = document.createElement('h4');
      name.textContent = user.username;
      infoDiv.appendChild(name);
      
      const status = document.createElement('p');
      status.className = 'status';
      status.textContent = user.status;
      infoDiv.appendChild(status);
      
      li.appendChild(infoDiv);
      onlineUsersList.appendChild(li);
    }
  });
}

// Update user count display
function updateUserCount() {
  const count = state.users.length;
  onlineCount.textContent = count;
  activeNow.textContent = count;
}

// Handle typing events
function handleTyping() {
  if (!state.isTyping) {
    state.isTyping = true;
    socket.emit('typing', state.username);
  }
  
  // Clear existing timeout
  clearTimeout(state.typingTimeout);
  
  // Set new timeout
  state.typingTimeout = setTimeout(stopTyping, 2000);
}

// Stop typing indicator
function stopTyping() {
  if (state.isTyping) {
    state.isTyping = false;
    socket.emit('stop typing', state.username);
  }
}

// Handle user typing event
function handleUserTyping(username) {
  if (username !== state.username) {
    const typingUsername = document.getElementById('typing-username');
    typingUsername.textContent = username;
    typingIndicator.style.display = 'block';
  }
}

// Handle user stop typing event
function handleUserStopTyping() {
  typingIndicator.style.display = 'none';
}

// Toggle dark mode
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark-mode', state.darkMode);
  
  // Update button icon
  const icon = toggleThemeBtn.querySelector('i');
  icon.className = state.darkMode ? 'fas fa-sun' : 'fas fa-moon';
  
  // Save preference
  localStorage.setItem('darkMode', state.darkMode);
}

// Clear messages
function clearMessages() {
  if (confirm('Are you sure you want to clear all messages?')) {
    messages.innerHTML = '';
    addSystemMessage('Chat history cleared');
  }
}

// Handle scroll in chat container
function handleScroll() {
  const container = messages.parentElement;
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
  
  if (isAtBottom) {
    state.isAtBottom = true;
    state.unreadMessages = 0;
    updateNewMessageNotification();
  } else {
    state.isAtBottom = false;
  }
}

// Update new message notification
function updateNewMessageNotification() {
  if (state.unreadMessages > 0) {
    newMessagesNotification.textContent = `${state.unreadMessages} new message${state.unreadMessages > 1 ? 's' : ''}`;
    newMessagesNotification.classList.add('visible');
  } else {
    newMessagesNotification.classList.remove('visible');
  }
}

// Scroll to bottom of messages
function scrollToBottom() {
  const container = messages.parentElement;
  container.scrollTop = container.scrollHeight;
  state.isAtBottom = true;
  state.unreadMessages = 0;
  updateNewMessageNotification();
}

// Toggle emoji picker
function toggleEmojiPicker() {
  const isVisible = emojiPicker.style.display === 'block';
  emojiPicker.style.display = isVisible ? 'none' : 'block';
}

// Handle attachment
function handleAttachment() {
  alert('File attachment functionality coming soon!');
}

// Open profile modal
function openProfileModal() {
  editUsername.value = state.username;
  editProfilePic.value = state.profilePic === `${DEFAULT_AVATAR}${encodeURIComponent(state.username)}` ? '' : state.profilePic;
  editStatus.value = state.status;
  updateAvatarPreview(editProfilePic.value, editAvatarPreview);
  
  profileModal.classList.add('active');
}

// Close profile modal
function closeProfileModal() {
  profileModal.classList.remove('active');
}

// Save profile changes
function saveProfileChanges() {
  const newUsername = editUsername.value.trim();
  const newProfilePic = editProfilePic.value.trim();
  const newStatus = editStatus.value;
  
  if (!newUsername) {
    shakeElement(editUsername);
    return;
  }
  
  // Update user data
  const oldUsername = state.username;
  state.username = newUsername;
  state.profilePic = newProfilePic || `${DEFAULT_AVATAR}${encodeURIComponent(newUsername)}`;
  state.status = newStatus;
  
  // Update UI
  currentUsername.textContent = state.username;
  currentStatus.textContent = state.status;
  updateAvatarDisplay();
  
  // Save data
  saveUserData();
  
  // Notify server about profile update
  socket.emit('profile update', {
    oldUsername,
    username: state.username,
    profilePic: state.profilePic,
    status: state.status
  });
  
  // Add system message
  addSystemMessage('Your profile has been updated');
  
  // Close modal
  closeProfileModal();
}

// Shake element animation for validation
function shakeElement(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
  
  // Add shake animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      border-color: #f44336 !important;
    }
  `;
  document.head.appendChild(style);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);