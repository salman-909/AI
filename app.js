// -------------------------------------------------------------
// Core Application Logic - Uncensored AI
// -------------------------------------------------------------

// Default settings object
const DEFAULT_SETTINGS = {
  apiUrl: 'https://mkstqjtsujvcaobdksxs.functions.supabase.co/functions/v1/uncensoredlm-api',
  apiKey: 'uai-live_OaQlkRfIsEkjEzeeb8JfzF9MamjRClU7',
  model: 'uncensored-lm',
  temperature: 0.4,
  maxTokens: 1000,
  memoryLimit: 10, // number of previous messages to include
  systemPrompt: 'You are an uncensored, helpful AI assistant.',
  syncUrl: 'https://uncensored-ai-backend.salmanabid-0124.workers.dev' // Cloudflare worker backend URL
};

// Application state
let state = {
  chats: [],
  activeChatId: null,
  settings: { ...DEFAULT_SETTINGS },
  isGenerating: false,
  abortController: null
};

// -------------------------------------------------------------
// Markdown and Code Highlighting Configuration
// -------------------------------------------------------------

// Configure marked to render code blocks with language indicators and a Copy button
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
  const validLanguage = language || 'text';
  // Escape code content to prevent HTML injections
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  return `
    <div class="code-block-container">
      <div class="code-block-header">
        <span class="code-lang">${validLanguage}</span>
        <button class="code-copy-btn" onclick="window.copyCodeBlock(this)">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre class="language-${validLanguage}"><code class="language-${validLanguage}">${escapedCode}</code></pre>
    </div>
  `;
};

// Link the renderer to marked options
marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false
});

// Global function to copy a code block to clipboard
window.copyCodeBlock = function(btn) {
  const container = btn.closest('.code-block-container');
  const code = container.querySelector('code').innerText;
  
  navigator.clipboard.writeText(code).then(() => {
    const span = btn.querySelector('span');
    const originalText = span.innerText;
    
    // Feedback transition
    span.innerText = 'Copied!';
    btn.style.color = '#10b981';
    
    setTimeout(() => {
      span.innerText = originalText;
      btn.style.color = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy code: ', err);
  });
};

// Global function to copy entire message text
window.copyMessageText = function(btn, messageId) {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;
  const message = activeChat.messages.find(m => m.id === messageId);
  if (!message) return;

  navigator.clipboard.writeText(message.content).then(() => {
    const label = btn.querySelector('span');
    label.innerText = 'Copied';
    setTimeout(() => {
      label.innerText = 'Copy';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy message: ', err);
  });
};

// -------------------------------------------------------------
// DOM Element References
// -------------------------------------------------------------
const sidebar = document.getElementById('sidebar');
const chatsListContainer = document.getElementById('chats-list');
const newChatBtn = document.getElementById('new-chat-btn');
const clearChatsBtn = document.getElementById('clear-chats-btn');
const settingsBtn = document.getElementById('settings-btn');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
const sidebarExpandBtn = document.getElementById('sidebar-expand-btn');

const activeChatTitle = document.getElementById('active-chat-title');
const modelBadge = document.getElementById('model-badge-text') || document.getElementById('model-badge');
const modelBadgeText = document.getElementById('model-badge-text');
const memoryStatusText = document.getElementById('memory-status-text');

const welcomeScreen = document.getElementById('welcome-screen');
const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const stopGenerationBtn = document.getElementById('stop-generation-btn');

// Settings Modal elements
const settingsModal = document.getElementById('settings-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const apiKeyInput = document.getElementById('settings-api-key');
const apiUrlInput = document.getElementById('settings-api-url');
const modelInput = document.getElementById('settings-model');
const tempInput = document.getElementById('settings-temperature');
const tempVal = document.getElementById('temp-val');
const maxTokensInput = document.getElementById('settings-max-tokens');
const memoryLimitInput = document.getElementById('settings-memory-limit');
const memoryVal = document.getElementById('memory-val');
const systemPromptInput = document.getElementById('settings-system-prompt');
const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
const eyeIcon = document.getElementById('eye-icon');

const saveSettingsBtn = document.getElementById('settings-save-btn');
const cancelSettingsBtn = document.getElementById('settings-cancel-btn');
const resetSettingsBtn = document.getElementById('settings-reset-btn');

// Theme Switcher elements
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');
const themeText = document.getElementById('theme-text');

// Passcode Sign-In elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginPasscode = document.getElementById('login-passcode');
const loginErrorMsg = document.getElementById('login-error-msg');
const logoutBtn = document.getElementById('logout-btn');
const toggleLoginPasscodeVisibilityBtn = document.getElementById('toggle-login-passcode-visibility');
const loginEyeIcon = document.getElementById('login-eye-icon');

// User Profile Menu & Temporary Chat Elements
const sidebarProfileBtn = document.getElementById('sidebar-profile-btn');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profilePopoverMenu = document.getElementById('profile-popover-menu');
const startTempChatBtn = document.getElementById('start-temp-chat-btn');
const headerTempChatBtn = document.getElementById('header-temp-chat-btn');
const headerTempChatContainer = document.getElementById('header-temp-chat-container');
const tempChatHeaderBanner = document.getElementById('temp-chat-header-banner');
const headerNewChatBtn = document.getElementById('header-new-chat-btn');
const modelSelectBtn = document.getElementById('model-select-btn');
const modelDropdownMenu = document.getElementById('model-dropdown-menu');

// Custom Dialog Modal elements
const customDialogModal = document.getElementById('custom-dialog-modal');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogCancelBtn = document.getElementById('dialog-cancel-btn');
const dialogConfirmBtn = document.getElementById('dialog-confirm-btn');
const dialogCloseBtn = document.getElementById('dialog-close-btn');

// Quick Prompt elements
const quickPromptCards = document.querySelectorAll('.quick-prompt-card');

// -------------------------------------------------------------
// State Persistence Helpers
// -------------------------------------------------------------
function loadLocalSettingsOnly() {
  try {
    const savedSettings = localStorage.getItem('uncensored_ai_settings');
    if (savedSettings) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    }
    // Hardforce the syncUrl and never allow it to be empty or overwritten
    state.settings.syncUrl = 'https://uncensored-ai-backend.salmanabid-0124.workers.dev';
  } catch (err) {
    console.error('Failed to load local settings: ', err);
    state.settings.syncUrl = 'https://uncensored-ai-backend.salmanabid-0124.workers.dev';
  }
}

async function loadStateFromStorage() {
  try {
    loadLocalSettingsOnly();
    const savedActiveId = localStorage.getItem('uncensored_ai_active_chat_id');
    if (savedActiveId) state.activeChatId = savedActiveId;

    if (state.settings.syncUrl) {
      const accessKey = localStorage.getItem('uncensored_ai_access_key') || '';
      const chatsUrl = `${state.settings.syncUrl.replace(/\/$/, '')}/api/chats`;
      
      const response = await fetch(chatsUrl, {
        method: 'GET',
        headers: {
          'X-Access-Key': accessKey,
          'Authorization': `Bearer ${accessKey}`
        }
      });
      
      if (response.ok) {
        state.chats = await response.json();
      } else {
        console.warn('Sync server load failed, falling back to local cache.');
        const savedChats = localStorage.getItem('uncensored_ai_chats');
        if (savedChats) state.chats = JSON.parse(savedChats);
      }
    } else {
      const savedChats = localStorage.getItem('uncensored_ai_chats');
      if (savedChats) state.chats = JSON.parse(savedChats);
    }
  } catch (err) {
    console.error('Failed to load state: ', err);
    const savedChats = localStorage.getItem('uncensored_ai_chats');
    if (savedChats) state.chats = JSON.parse(savedChats);
  }
}

async function saveChatsToStorage() {
  try {
    const nonTempChats = state.chats.filter(c => !c.temporary);
    localStorage.setItem('uncensored_ai_chats', JSON.stringify(nonTempChats));

    if (state.settings.syncUrl) {
      const accessKey = localStorage.getItem('uncensored_ai_access_key') || '';
      const chatsUrl = `${state.settings.syncUrl.replace(/\/$/, '')}/api/chats`;
      
      await fetch(chatsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': accessKey,
          'Authorization': `Bearer ${accessKey}`
        },
        body: JSON.stringify({ chats: nonTempChats })
      });
    }
  } catch (err) {
    console.error('Failed to sync chats online: ', err);
  }
}

function saveActiveChatIdToStorage() {
  if (state.activeChatId) {
    localStorage.setItem('uncensored_ai_active_chat_id', state.activeChatId);
  } else {
    localStorage.removeItem('uncensored_ai_active_chat_id');
  }
}

function saveSettingsToStorage() {
  localStorage.setItem('uncensored_ai_settings', JSON.stringify(state.settings));
}

// -------------------------------------------------------------
// UI Updates & Rendering
// -------------------------------------------------------------

// Populate settings form inputs from state settings
function populateSettingsForm() {
  apiKeyInput.value = state.settings.apiKey;
  apiUrlInput.value = state.settings.apiUrl;
  modelInput.value = state.settings.model;
  tempInput.value = state.settings.temperature;
  tempVal.innerText = state.settings.temperature;
  maxTokensInput.value = state.settings.maxTokens;
  
  memoryLimitInput.value = state.settings.memoryLimit;
  updateMemorySliderText(state.settings.memoryLimit);
  
  systemPromptInput.value = state.settings.systemPrompt;
}

// Helper to translate slider values to UI texts
function updateMemorySliderText(val) {
  const numericVal = parseInt(val);
  if (numericVal === 0) {
    memoryVal.innerText = 'Disabled';
  } else if (numericVal === 20) {
    memoryVal.innerText = 'Unlimited';
  } else {
    memoryVal.innerText = `${numericVal} messages`;
  }
}

function updateBadgeStatus() {
  modelBadge.innerText = (state.settings.model === 'uncensored-lm') ? 'Uncensored' : state.settings.model;
  const numLimit = parseInt(state.settings.memoryLimit);
  if (numLimit === 0) {
    memoryStatusText.innerText = 'Memory: Disabled';
    document.querySelector('.indicator-dot').className = 'indicator-dot orange';
  } else if (numLimit === 20) {
    memoryStatusText.innerText = 'Memory: Unlimited';
    document.querySelector('.indicator-dot').className = 'indicator-dot green';
  } else {
    memoryStatusText.innerText = `Memory: ${numLimit} msg`;
    document.querySelector('.indicator-dot').className = 'indicator-dot green';
  }
}

// Render sidebar list of conversations
function renderChatsList() {
  chatsListContainer.innerHTML = '';
  
  const nonTempChats = state.chats.filter(c => !c.temporary);
  if (nonTempChats.length === 0) {
    chatsListContainer.innerHTML = `<div class="sidebar-footer-note" style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px;">No chats yet</div>`;
    return;
  }

  // Sort chats chronologically: newest first
  const sortedChats = [...nonTempChats].sort((a, b) => b.timestamp - a.timestamp);

  sortedChats.forEach(chat => {
    const isActive = chat.id === state.activeChatId;
    const item = document.createElement('div');
    item.className = `chat-item ${isActive ? 'active' : ''}`;
    item.dataset.id = chat.id;

    item.innerHTML = `
      <div class="chat-item-left">
        <svg class="chat-item-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="chat-item-title" id="title-span-${chat.id}">${escapeHtml(chat.title)}</span>
      </div>
      <div class="chat-item-actions">
        <button class="chat-item-action edit-action" data-action="rename" title="Rename conversation">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </button>
        <button class="chat-item-action delete-action" data-action="delete" title="Delete conversation">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    // Click on chat item selects it
    item.addEventListener('click', (e) => {
      // Check if button click
      const actionBtn = e.target.closest('.chat-item-action');
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        if (action === 'delete') {
          deleteChat(chat.id);
        } else if (action === 'rename') {
          startRenameChat(chat.id);
        }
        return;
      }
      selectChat(chat.id);
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });

    chatsListContainer.appendChild(item);
  });
}

// Render active chat message thread
function renderActiveChatMessages() {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  
  // Update visibility of temporary chat toggle in the header
  updateHeaderTempChatVisibility();
  
  if (!activeChat || activeChat.messages.length === 0) {
    // Show welcome screen
    welcomeScreen.classList.remove('hidden');
    messagesContainer.classList.add('hidden');
    activeChatTitle.innerText = activeChat ? activeChat.title : 'New Chat';
    return;
  }

  welcomeScreen.classList.add('hidden');
  messagesContainer.classList.remove('hidden');
  activeChatTitle.innerText = activeChat.title;

  messagesContainer.innerHTML = '';

  if (activeChat.temporary) {
    const banner = document.createElement('div');
    banner.className = 'temp-chat-banner-messages';
    banner.innerHTML = `
      <span>⏳ <strong>Temporary Chat</strong></span>
      <span style="font-size:0.78rem; color:var(--text-sidebar-muted);">This conversation isn't saved to history. Once you close it or toggle it off, it is deleted.</span>
    `;
    messagesContainer.appendChild(banner);
  }

  activeChat.messages.forEach(msg => {
    const isUser = msg.role === 'user';
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isUser ? 'user' : 'assistant'}`;

    let formattedContent = isUser ? escapeHtml(msg.content) : marked.parse(msg.content);
    
    // Universal copy button for both user and assistant messages
    const actionsHtml = `
      <div class="message-meta">
        <button class="action-btn-link" onclick="window.copyMessageText(this, '${msg.id}')">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        </button>
      </div>
    `;

    wrapper.innerHTML = `
      <div class="message-content-wrapper">
        <div class="message-bubble">${formattedContent}</div>
        ${actionsHtml}
      </div>
    `;

    messagesContainer.appendChild(wrapper);
  });

  // Re-run syntax highlighting on newly rendered messages
  Prism.highlightAllUnder(messagesContainer);
  scrollToBottom();
}

// Render thinking/loading indicator bubble
function showTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant typing-indicator-wrapper';
  wrapper.innerHTML = `
    <div class="message-content-wrapper">
      <div class="message-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = messagesContainer.querySelector('.typing-indicator-wrapper');
  if (indicator) indicator.remove();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// -------------------------------------------------------------
// State Modification Operations
// -------------------------------------------------------------
function selectChat(chatId) {
  // If selecting a normal chat and temporary chat mode is active, toggle it off
  if (state.isTemporaryChat && !chatId.startsWith('temp_')) {
    state.isTemporaryChat = false;
    document.body.classList.remove('temporary-chat-mode');
    if (tempChatHeaderBanner) tempChatHeaderBanner.classList.add('hidden');
    // Purge temporary chats from state
    state.chats = state.chats.filter(c => !c.temporary);
  }

  state.activeChatId = chatId;
  saveActiveChatIdToStorage();
  renderChatsList();
  renderActiveChatMessages();
  chatInput.focus();
}

function createNewChat() {
  // If temporary chat mode is active, toggle it off when starting a new normal chat
  if (state.isTemporaryChat) {
    state.isTemporaryChat = false;
    document.body.classList.remove('temporary-chat-mode');
    if (tempChatHeaderBanner) tempChatHeaderBanner.classList.add('hidden');
    // Purge temporary chats from state
    state.chats = state.chats.filter(c => !c.temporary);
  }

  // If we already have an empty active chat, stay on it and do nothing
  if (state.activeChatId) {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat && activeChat.messages.length === 0) {
      return;
    }
  }

  const newId = 'chat_' + Date.now();
  const newChat = {
    id: newId,
    title: 'New Chat',
    messages: [],
    timestamp: Date.now()
  };
  state.chats.push(newChat);
  saveChatsToStorage();
  selectChat(newId);
}

async function deleteChat(chatId) {
  const confirmed = await showCustomDialog({
    title: 'Delete Conversation',
    message: 'Are you sure you want to delete this conversation? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });
  if (confirmed) {
    state.chats = state.chats.filter(c => c.id !== chatId);
    saveChatsToStorage();

    if (state.activeChatId === chatId) {
      if (state.chats.length > 0) {
        // Select the newest chat remaining
        const sorted = [...state.chats].sort((a, b) => b.timestamp - a.timestamp);
        selectChat(sorted[0].id);
      } else {
        state.activeChatId = null;
        saveActiveChatIdToStorage();
        renderChatsList();
        renderActiveChatMessages();
      }
    } else {
      renderChatsList();
    }
  }
}

function startRenameChat(chatId) {
  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return;

  const titleSpan = document.getElementById(`title-span-${chatId}`);
  const currentTitle = titleSpan.innerText;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chat-item-input';
  input.value = currentTitle;

  // Replace text span with input
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  // Save on blur or enter key
  const saveRename = () => {
    const newTitle = input.value.trim() || 'Untitled Chat';
    chat.title = newTitle;
    saveChatsToStorage();
    renderChatsList();
  };

  input.addEventListener('blur', saveRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.removeEventListener('blur', saveRename); // prevent double triggers
      saveRename();
    } else if (e.key === 'Escape') {
      input.removeEventListener('blur', saveRename);
      renderChatsList();
    }
  });
}

async function clearAllConversations() {
  const confirmed = await showCustomDialog({
    title: 'Clear All Conversations',
    message: 'WARNING: This will permanently delete ALL saved conversations. This action is irreversible. Continue?',
    confirmText: 'Clear All',
    cancelText: 'Cancel',
    type: 'danger'
  });
  if (confirmed) {
    state.chats = [];
    state.activeChatId = null;
    saveChatsToStorage();
    saveActiveChatIdToStorage();
    renderChatsList();
    renderActiveChatMessages();
  }
}

// -------------------------------------------------------------
// API Integration & Generation
// -------------------------------------------------------------
async function handleSendRequest() {
  const content = chatInput.value.trim();
  if (!content || state.isGenerating) return;

  // Set input heights back to auto
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // If no chat is active, create a new one first
  let activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) {
    const newId = (state.isTemporaryChat ? 'temp_' : 'chat_') + Date.now();
    activeChat = {
      id: newId,
      title: state.isTemporaryChat ? 'Temporary Chat' : (content.substring(0, 30) + (content.length > 30 ? '...' : '')),
      messages: [],
      timestamp: Date.now(),
      temporary: state.isTemporaryChat ? true : false
    };
    state.chats.push(activeChat);
    state.activeChatId = newId;
    saveActiveChatIdToStorage();
  } else if (activeChat.messages.length === 0 && !activeChat.temporary) {
    // Auto rename active chat title based on the first message
    activeChat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
  }

  // Push user message
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    content: content,
    timestamp: Date.now()
  };
  activeChat.messages.push(userMsg);
  activeChat.timestamp = Date.now();
  saveChatsToStorage();

  // Render immediately in chat container
  renderChatsList();
  renderActiveChatMessages();

  // Toggle generating state
  setGeneratingState(true);
  showTypingIndicator();

  // Build the message history based on memory limit settings
  const apiMessages = [];
  
  // Add System prompt
  if (state.settings.systemPrompt.trim()) {
    apiMessages.push({
      role: 'system',
      content: state.settings.systemPrompt
    });
  }

  // Force unlimited memory context size (send all conversation messages)
  let relevantMessages = activeChat.messages;

  // Push message objects into payload format
  relevantMessages.forEach(m => {
    apiMessages.push({
      role: m.role,
      content: m.content
    });
  });

  try {
    state.abortController = new AbortController();
    const signal = state.abortController.signal;

    const response = await fetch(state.settings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.settings.apiKey}`
      },
      body: JSON.stringify({
        model: state.settings.model,
        messages: apiMessages,
        temperature: parseFloat(state.settings.temperature),
        max_tokens: parseInt(state.settings.maxTokens)
      }),
      signal: signal
    });

    removeTypingIndicator();

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error Status ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    // Validate answer choices structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid API response shape. Missing choices object.");
    }

    const aiText = data.choices[0].message.content;
    await streamTypingEffect(aiText);

  } catch (err) {
    removeTypingIndicator();
    if (err.name === 'AbortError') {
      // User cancelled generation
      const stopMsg = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: '*[Generation Stopped by User]*',
        timestamp: Date.now()
      };
      activeChat.messages.push(stopMsg);
      saveChatsToStorage();
      renderActiveChatMessages();
    } else {
      console.error(err);
      // Display error panel in message list
      renderErrorCard(err.message);
    }
  } finally {
    setGeneratingState(false);
  }
}

// Function to simulate typing text word-by-word for high-end look
function streamTypingEffect(fullText) {
  return new Promise((resolve) => {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (!activeChat) {
      resolve();
      return;
    }

    const assistantMsgId = 'msg_' + Date.now();
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '', // start empty
      timestamp: Date.now()
    };
    
    activeChat.messages.push(assistantMsg);
    
    // Create an empty message node in container
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper assistant';
    wrapper.innerHTML = `
      <div class="message-content-wrapper">
        <div class="message-bubble"></div>
        <div class="message-meta">
          <button class="action-btn-link" onclick="window.copyMessageText(this, '${assistantMsgId}')">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          </button>
        </div>
      </div>
    `;
    messagesContainer.appendChild(wrapper);
    
    const bubble = wrapper.querySelector('.message-bubble');
    
    // Splitting text into pieces (either letters or small groups of words)
    const words = fullText.split(' ');
    let currentIdx = 0;
    let typedText = '';

    const typingInterval = setInterval(() => {
      // Check if generation was cancelled or aborted during typing
      if (!state.isGenerating || state.activeChatId !== activeChat.id) {
        clearInterval(typingInterval);
        resolve();
        return;
      }

      if (currentIdx < words.length) {
        typedText += (currentIdx === 0 ? '' : ' ') + words[currentIdx];
        // Render markdown updates in-progress
        bubble.innerHTML = marked.parse(typedText);
        Prism.highlightAllUnder(bubble);
        scrollToBottom();
        currentIdx++;
      } else {
        clearInterval(typingInterval);
        // Save final content to the state object
        assistantMsg.content = fullText;
        saveChatsToStorage();
        resolve();
      }
    }, 18); // smooth word-by-word scroll
  });
}

function renderErrorCard(errorMsg) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant';
  wrapper.innerHTML = `
    <div class="message-content-wrapper" style="max-width:100%">
      <div class="message-bubble" style="border:1px solid #f87171; background:rgba(220,38,38,0.1); color:#fca5a5;">
        <h4 style="font-weight:600; margin-bottom:5px;">Connection & Request Failure</h4>
        <p style="font-size:0.88rem; line-height:1.4">${escapeHtml(errorMsg)}</p>
        <button class="btn btn-secondary" onclick="document.getElementById('settings-btn').click()" style="margin-top:10px; padding: 6px 12px; font-size:0.8rem; border-color:rgba(248,113,113,0.3)">
          Open API Settings
        </button>
      </div>
    </div>
  `;
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
}

function setGeneratingState(generating) {
  state.isGenerating = generating;
  if (generating) {
    sendMessageBtn.disabled = true;
    stopGenerationBtn.classList.remove('hidden');
  } else {
    sendMessageBtn.disabled = false;
    stopGenerationBtn.classList.add('hidden');
    state.abortController = null;
  }
}

// -------------------------------------------------------------
// Interactive Element Events
// -------------------------------------------------------------

// Open / Close Settings Modal
settingsBtn.addEventListener('click', () => {
  populateSettingsForm();
  settingsModal.classList.remove('hidden');
});

modalCloseBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

cancelSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

// Reset Settings
resetSettingsBtn.addEventListener('click', async () => {
  const confirmed = await showCustomDialog({
    title: 'Reset Settings',
    message: 'Are you sure you want to reset all API parameters to defaults?',
    confirmText: 'Reset',
    cancelText: 'Cancel',
    type: 'warning'
  });
  if (confirmed) {
    state.settings = { ...DEFAULT_SETTINGS };
    saveSettingsToStorage();
    populateSettingsForm();
    updateBadgeStatus();
  }
});

// Save Settings Form
saveSettingsBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  const url = apiUrlInput.value.trim();
  const model = modelInput.value.trim();
  const temp = parseFloat(tempInput.value);
  const maxTokens = parseInt(maxTokensInput.value) || 1000;
  const memoryLimit = parseInt(memoryLimitInput.value);
  const sysPrompt = systemPromptInput.value;

  if (!key || !url || !model) {
    await showCustomDialog({
      title: 'Required Fields Missing',
      message: 'Please fill in required fields: API Key, Endpoint URL, and Model Name.',
      confirmText: 'OK',
      isAlert: true
    });
    return;
  }

  state.settings = {
    apiUrl: url,
    apiKey: key,
    syncUrl: 'https://uncensored-ai-backend.salmanabid-0124.workers.dev',
    model: model,
    temperature: temp,
    maxTokens: maxTokens,
    memoryLimit: memoryLimit,
    systemPrompt: sysPrompt
  };

  saveSettingsToStorage();
  updateBadgeStatus();
  settingsModal.classList.add('hidden');
});

// Range slider indicators
tempInput.addEventListener('input', () => {
  tempVal.innerText = tempInput.value;
});

memoryLimitInput.addEventListener('input', () => {
  updateMemorySliderText(memoryLimitInput.value);
});

// Sidebar Toggles (Mobile Drawer / Desktop Collapsible)
if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('open');
    }
  });
}

if (sidebarCollapseBtn) {
  sidebarCollapseBtn.addEventListener('click', () => {
    if (window.innerWidth > 768) {
      document.body.classList.add('sidebar-collapsed');
      localStorage.setItem('uncensored_ai_sidebar_collapsed', 'true');
    } else {
      sidebar.classList.remove('open');
    }
  });
}

if (sidebarExpandBtn) {
  sidebarExpandBtn.addEventListener('click', () => {
    if (window.innerWidth > 768) {
      document.body.classList.remove('sidebar-collapsed');
      localStorage.setItem('uncensored_ai_sidebar_collapsed', 'false');
    }
  });
}

if (sidebarCloseBtn) {
  sidebarCloseBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });
}

// Autogrow textarea resize
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = chatInput.scrollHeight + 'px';
});

// Key bindings in textarea
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // prevent actual new line
    handleSendRequest();
  }
});

// Clicking Send Button
sendMessageBtn.addEventListener('click', () => {
  handleSendRequest();
});

// Clicking Stop Button
stopGenerationBtn.addEventListener('click', () => {
  if (state.abortController) {
    state.abortController.abort();
  }
});

// Clicking New Chat Button
newChatBtn.addEventListener('click', () => {
  createNewChat();
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
  }
});

// Clear All chats button
clearChatsBtn.addEventListener('click', () => {
  clearAllConversations();
});

// Eye Toggle API key visibility
toggleKeyVisibilityBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
  } else {
    apiKeyInput.type = 'password';
    eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  }
});

// Quick Prompts clicking
quickPromptCards.forEach(card => {
  card.addEventListener('click', () => {
    const promptText = card.dataset.prompt;
    chatInput.value = promptText;
    chatInput.dispatchEvent(new Event('input')); // trigger autoheight
    handleSendRequest();
  });
});

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
async function init() {
  loadLocalSettingsOnly();
  initTheme();
  initSidebar();
  
  if (!checkAuthentication()) {
    showLoginScreen();
    return;
  } else {
    hideLoginScreen();
    updateSidebarProfile();
  }
  
  await loadStateFromStorage();
  updateBadgeStatus();
  renderChatsList();
  
  if (state.activeChatId) {
    selectChat(state.activeChatId);
  } else {
    renderActiveChatMessages();
  }
}

// -------------------------------------------------------------
// Authenticated Passcode & Theme Switcher Handlers
// -------------------------------------------------------------

function initTheme() {
  const currentTheme = localStorage.getItem('uncensored_ai_theme') || 'dark';
  setTheme(currentTheme);
}

function initSidebar() {
  const isCollapsed = localStorage.getItem('uncensored_ai_sidebar_collapsed') === 'true';
  if (isCollapsed && window.innerWidth > 768) {
    document.body.classList.add('sidebar-collapsed');
  } else {
    document.body.classList.remove('sidebar-collapsed');
  }
}

function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    themeIconSun.classList.remove('hidden');
    themeIconMoon.classList.add('hidden');
    themeText.innerText = 'Dark Theme';
    localStorage.setItem('uncensored_ai_theme', 'light');
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    themeIconSun.classList.add('hidden');
    themeIconMoon.classList.remove('hidden');
    themeText.innerText = 'Light Theme';
    localStorage.setItem('uncensored_ai_theme', 'dark');
  }
}

function checkAuthentication() {
  const key = localStorage.getItem('uncensored_ai_access_key');
  const authenticated = localStorage.getItem('uncensored_ai_authenticated');
  return key && authenticated === 'true';
}

function showLoginScreen() {
  loginOverlay.classList.remove('hidden');
}

function hideLoginScreen() {
  loginOverlay.classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const passcode = loginPasscode.value.trim();
  if (!passcode) return;

  const loginBtn = loginForm.querySelector('.btn-login');
  loginBtn.disabled = true;
  loginBtn.innerText = 'Signing In...';
  loginErrorMsg.classList.add('hidden');

  try {
    if (state.settings.syncUrl) {
      const authUrl = `${state.settings.syncUrl.replace(/\/$/, '')}/api/auth`;
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Incorrect passcode');
      }
    } else {
      // Local mode validation passcode check
      if (passcode !== 'admin123') {
        throw new Error('Incorrect passcode. Please try again.');
      }
    }

    localStorage.setItem('uncensored_ai_access_key', passcode);
    localStorage.setItem('uncensored_ai_authenticated', 'true');
    hideLoginScreen();
    loginPasscode.value = '';
    updateSidebarProfile();

    await loadStateFromStorage();
    renderChatsList();
    renderActiveChatMessages();
    updateBadgeStatus();

  } catch (err) {
    console.error(err);
    loginErrorMsg.innerText = err.message || 'Authentication error';
    loginErrorMsg.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = 'Sign In';
  }
}

async function handleLogout() {
  const confirmed = await showCustomDialog({
    title: 'Lock Session',
    message: 'Are you sure you want to lock the session? You will need to enter your passcode again to access your chats.',
    confirmText: 'Lock Session',
    cancelText: 'Cancel',
    type: 'warning'
  });
  if (confirmed) {
    // Reset temporary state
    state.isTemporaryChat = false;
    if (tempChatHeaderBanner) tempChatHeaderBanner.classList.add('hidden');

    localStorage.removeItem('uncensored_ai_access_key');
    localStorage.removeItem('uncensored_ai_authenticated');
    state.chats = [];
    state.activeChatId = null;
    saveActiveChatIdToStorage();
    renderChatsList();
    renderActiveChatMessages();
    showLoginScreen();
  }
}

// Add Click Handlers for new features
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = localStorage.getItem('uncensored_ai_theme') || 'dark';
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// Eye Toggle Login passcode visibility
if (toggleLoginPasscodeVisibilityBtn) {
  toggleLoginPasscodeVisibilityBtn.addEventListener('click', () => {
    if (loginPasscode.type === 'password') {
      loginPasscode.type = 'text';
      loginEyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
    } else {
      loginPasscode.type = 'password';
      loginEyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
  });
}

loginForm.addEventListener('submit', handleLogin);
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleLogout();
  });
}

// -------------------------------------------------------------
// ChatGPT Profile Bar, Model Dropdown & Temporary Chat Core Functions
// -------------------------------------------------------------

function updateSidebarProfile() {
  const passcode = localStorage.getItem('uncensored_ai_access_key') || 'User';
  let name = passcode;
  if (passcode.includes('@')) {
    name = passcode.split('@')[0];
  }
  // Format Name: capitalize first letter, limit length
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const initials = name.substring(0, 2).toUpperCase();
  
  if (profileName) profileName.innerText = formattedName;
  if (profileAvatar) profileAvatar.innerText = initials;
}

// Sidebar Profile click to open context menu
if (sidebarProfileBtn) {
  sidebarProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = sidebarProfileBtn.getAttribute('aria-expanded') === 'true';
    sidebarProfileBtn.setAttribute('aria-expanded', !isExpanded);
    profilePopoverMenu.classList.toggle('hidden');
  });
}

// Model dropdown button toggle
if (modelSelectBtn) {
  modelSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = modelSelectBtn.getAttribute('aria-expanded') === 'true';
    modelSelectBtn.setAttribute('aria-expanded', !isExpanded);
    modelDropdownMenu.classList.toggle('hidden');
  });
}

// Close overlays on click outside
document.addEventListener('click', (e) => {
  if (profilePopoverMenu && !profilePopoverMenu.classList.contains('hidden')) {
    if (!profilePopoverMenu.contains(e.target) && e.target !== sidebarProfileBtn && !sidebarProfileBtn.contains(e.target)) {
      profilePopoverMenu.classList.add('hidden');
      sidebarProfileBtn.setAttribute('aria-expanded', 'false');
    }
  }
  if (modelDropdownMenu && !modelDropdownMenu.classList.contains('hidden')) {
    if (!modelDropdownMenu.contains(e.target) && e.target !== modelSelectBtn && !modelSelectBtn.contains(e.target)) {
      modelDropdownMenu.classList.add('hidden');
      modelSelectBtn.setAttribute('aria-expanded', 'false');
    }
  }
});

// Model select dropdown options
const modelOptions = document.querySelectorAll('.model-option');
modelOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    const selectedModel = opt.dataset.model;
    state.settings.model = selectedModel;
    saveSettingsToStorage();
    
    modelOptions.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    
    if (modelBadgeText) modelBadgeText.innerText = (selectedModel === 'uncensored-lm') ? 'Uncensored' : selectedModel;
    
    modelDropdownMenu.classList.add('hidden');
    modelSelectBtn.setAttribute('aria-expanded', 'false');
    updateBadgeStatus();
  });
});

// Start Temporary Chat button click listeners
if (startTempChatBtn) {
  startTempChatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleTemporaryChatMode(true);
  });
}

if (headerTempChatBtn) {
  headerTempChatBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Toggle: if already active, exit; otherwise start
    toggleTemporaryChatMode(!state.isTemporaryChat);
  });
}

function toggleTemporaryChatMode(isActive) {
  state.isTemporaryChat = isActive;
  if (isActive) {
    document.body.classList.add('temporary-chat-mode');
    if (tempChatHeaderBanner) tempChatHeaderBanner.classList.remove('hidden');
    startTemporaryChatSession();
  } else {
    document.body.classList.remove('temporary-chat-mode');
    if (tempChatHeaderBanner) tempChatHeaderBanner.classList.add('hidden');
    exitTemporaryChatSession();
  }
}

function updateHeaderTempChatVisibility() {
  // We no longer have toggle switch in the header, so this is left simple/no-op
}

function startTemporaryChatSession() {
  // Generate a special temporary ID in memory
  state.activeChatId = 'temp_' + Date.now();
  
  // Close the popup menu
  if (profilePopoverMenu) {
    profilePopoverMenu.classList.add('hidden');
    sidebarProfileBtn.setAttribute('aria-expanded', 'false');
  }
  
  // Clear layout views
  welcomeScreen.classList.remove('hidden');
  messagesContainer.classList.add('hidden');
  activeChatTitle.innerText = 'Temporary Chat';
  
  // Render temporary layout block
  renderActiveChatMessages();
  chatInput.focus();
}

function exitTemporaryChatSession() {
  state.isTemporaryChat = false;
  document.body.classList.remove('temporary-chat-mode');
  if (tempChatHeaderBanner) tempChatHeaderBanner.classList.add('hidden');
  
  // Close profile popover menu
  if (profilePopoverMenu) {
    profilePopoverMenu.classList.add('hidden');
    sidebarProfileBtn.setAttribute('aria-expanded', 'false');
  }

  // Purge temporary chats from state
  state.chats = state.chats.filter(c => !c.temporary);
  
  // Fallback to latest non-temporary session
  const remaining = state.chats.filter(c => !c.temporary);
  if (remaining.length > 0) {
    const sorted = [...remaining].sort((a, b) => b.timestamp - a.timestamp);
    selectChat(sorted[0].id);
  } else {
    state.activeChatId = null;
    saveActiveChatIdToStorage();
    renderChatsList();
    renderActiveChatMessages();
  }
}

// Collapsed Header New Chat Icon Button
if (headerNewChatBtn) {
  headerNewChatBtn.addEventListener('click', () => {
    if (state.activeChatId) {
      const activeChat = state.chats.find(c => c.id === state.activeChatId);
      if (activeChat && activeChat.messages.length === 0) {
        return;
      }
      if (state.isTemporaryChat && (!activeChat || activeChat.messages.length === 0)) {
        return;
      }
    }
    
    if (state.isTemporaryChat) {
      startTemporaryChatSession();
    } else {
      createNewChat();
    }
  });
}

// Custom Dialog Modal Promise Controller
function showCustomDialog(options = {}) {
  return new Promise((resolve) => {
    const title = options.title || 'Confirm';
    const message = options.message || 'Are you sure you want to proceed?';
    const confirmText = options.confirmText || 'Confirm';
    const cancelText = options.cancelText || 'Cancel';
    const type = options.type || 'info'; // 'info', 'warning', 'danger'
    const isAlert = options.isAlert || false;

    // Populate contents
    dialogTitle.innerText = title;
    dialogMessage.innerText = message;
    dialogConfirmBtn.innerText = confirmText;
    dialogCancelBtn.innerText = cancelText;

    // Reset button styles
    dialogConfirmBtn.className = 'btn btn-primary';
    if (type === 'danger') {
      dialogConfirmBtn.classList.add('btn-confirm-danger');
    } else if (type === 'warning') {
      dialogConfirmBtn.classList.add('btn-confirm-warning');
    }

    // Toggle cancel and close controls visibility for pure alerts
    if (isAlert) {
      dialogCancelBtn.classList.add('hidden');
      dialogCloseBtn.classList.add('hidden');
    } else {
      dialogCancelBtn.classList.remove('hidden');
      dialogCloseBtn.classList.remove('hidden');
    }

    // Show modal overlay
    customDialogModal.classList.remove('hidden');

    const cleanupAndResolve = (val) => {
      // Unbind temporary handlers
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      dialogCloseBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
      
      // Close modal
      customDialogModal.classList.add('hidden');
      resolve(val);
    };

    function onConfirm() {
      cleanupAndResolve(true);
    }

    function onCancel() {
      cleanupAndResolve(false);
    }

    function onKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape' && !isAlert) {
        e.preventDefault();
        onCancel();
      }
    }

    // Bind event handlers
    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    dialogCloseBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
  });
}

// Start application
init();
