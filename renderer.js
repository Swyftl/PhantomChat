document.addEventListener('DOMContentLoaded', () => {
    // Modal loading function
    async function loadModal(modalName) {
        try {
            const response = await fetch(`modals/${modalName}-modal.html`);
            const html = await response.text();
            
            // Remove existing modal if it exists
            const existingModal = document.getElementById(`${modalName}-modal`);
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add new modal to body
            document.body.insertAdjacentHTML('beforeend', html);
            
            // Return the new modal element
            return document.getElementById(`${modalName}-modal`);
        } catch (error) {
            console.error('Error loading modal:', error);
            return null;
        }
    }

    // Add Server Button Click Handler
    const addServerBtn = document.getElementById('add-server-btn');
    addServerBtn.addEventListener('click', async () => {
        const modal = await loadModal('add-server');
        if (modal) {
            modal.style.display = 'block';
            initAddServerModal(modal);
        }
    });

    // Settings Button Click Handler
    const settingsBtn = document.getElementById('client-settings');
    settingsBtn.addEventListener('click', async () => {
        const modal = await loadModal('settings');
        if (modal) {
            modal.style.display = 'block';
            initSettingsModal(modal);
        }
    });

    // Initialize Add Server Modal
    function initAddServerModal(modal) {
        const closeModal = modal.querySelector('.close-modal');
        const connectionForm = modal.querySelector('#server-connection-form');
        const authForm = modal.querySelector('#server-auth-form');
        const backBtn = modal.querySelector('.back-btn');
        let serverDetails = {};

        // Open modal
        addServerBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            connectionForm.style.display = 'block';
            authForm.style.display = 'none';
        });

        // Close modal
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
            serverDetails = {};
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                serverDetails = {};
            }
        });

        // Handle connection form submission (Page 1)
        connectionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            serverDetails.ip = document.getElementById('server-ip').value;
            serverDetails.port = document.getElementById('server-port').value;
            
            connectionForm.style.display = 'none';
            authForm.style.display = 'block';
        });

        // Handle back button
        backBtn.addEventListener('click', () => {
            authForm.style.display = 'none';
            connectionForm.style.display = 'block';
        });

        // Handle authentication form submission (Page 2)
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            serverDetails.username = document.getElementById('username').value;
            serverDetails.password = document.getElementById('password').value;
            
            // Send complete server details to main process
            window.electronAPI.addServer(serverDetails);

            // Reset and close
            connectionForm.reset();
            authForm.reset();
            modal.style.display = 'none';
            serverDetails = {};
        });
    }

    // Initialize Settings Modal
    function initSettingsModal(modal) {
        const closeSettings = modal.querySelector('.close-settings');
        const settingsSections = modal.querySelectorAll('.settings-section');
        const settingsPanels = modal.querySelectorAll('.settings-panel');

        // Open settings
        settingsBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        // Close settings
        closeSettings.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Close settings when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Switch settings panels
        settingsSections.forEach(section => {
            section.addEventListener('click', () => {
                // Remove active class from all sections and panels
                settingsSections.forEach(s => s.classList.remove('active'));
                settingsPanels.forEach(p => p.classList.remove('active'));

                // Add active class to clicked section and corresponding panel
                section.classList.add('active');
                const panelId = `${section.dataset.section}-settings`;
                document.getElementById(panelId).classList.add('active');
            });
        });

        // Theme selection handler
        const themeSelect = document.getElementById('theme-select');
        themeSelect.addEventListener('change', (e) => {
            window.electronAPI.setTheme(e.target.value);
        });

        // Privacy settings handler
        const gameStatusCheckbox = document.getElementById('show-current-game');
        gameStatusCheckbox.addEventListener('change', (e) => {
            window.electronAPI.setPrivacySetting('showGameStatus', e.target.checked);
        });
    }

    // Channel buttons
    document.getElementById('general-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('general');
    });

    document.getElementById('chat-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('chat');
    });

    // Message input
    let currentUsername = '';
    let currentChannel = 'general';
    const messageInput = document.getElementById('message-input-field');

    // Server connection status handler
    window.electronAPI.onServerConnection((status) => {
        if (status.success) {
            const serverIcon = document.createElement('div');
            serverIcon.className = 'server-icon';
            serverIcon.textContent = serverDetails.username.substring(0, 2).toUpperCase();
            document.querySelector('.servers-list').appendChild(serverIcon);
            
            currentUsername = serverDetails.username;
            document.getElementById('current-username').textContent = currentUsername;
        } else {
            alert('Failed to connect to server');
        }
    });

    // Chat message handler
    window.electronAPI.onChatMessage((message) => {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <span class="message-username">${message.username}</span>
            <span class="message-content">${message.content}</span>
        `;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    // Message input handler
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && messageInput.value.trim()) {
            window.electronAPI.sendMessage({
                channel: currentChannel,
                content: messageInput.value,
                username: currentUsername
            });
            messageInput.value = '';
        }
    });
});
