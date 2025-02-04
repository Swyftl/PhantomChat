document.addEventListener('DOMContentLoaded', () => {
    // Add state management at the top level
    const state = {
        currentServer: null,
        currentUsername: '',
        currentChannel: 'general',
        servers: new Map()
    };

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
        const authContainer = modal.querySelector('#auth-container');
        const loginForm = modal.querySelector('#server-auth-form');
        const registerForm = modal.querySelector('#server-register-form');
        const backBtns = modal.querySelectorAll('.back-btn');
        const authTabs = modal.querySelectorAll('.auth-tab');
        let serverDetails = {};  // Keep serverDetails in modal scope

        // Handle tab switching
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const forms = modal.querySelectorAll('.auth-form');
                forms.forEach(f => f.classList.remove('active'));
                
                const formId = tab.dataset.tab === 'login' ? 'server-auth-form' : 'server-register-form';
                modal.querySelector(`#${formId}`).classList.add('active');
            });
        });

        // Handle connection form submission
        connectionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            serverDetails.ip = document.getElementById('server-ip').value;
            serverDetails.port = document.getElementById('server-port').value;
            
            connectionForm.style.display = 'none';
            authContainer.style.display = 'block';
        });

        // Handle back buttons
        backBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                authContainer.style.display = 'none';
                connectionForm.style.display = 'block';
            });
        });

        // Handle login form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            serverDetails.username = document.getElementById('login-username').value;
            serverDetails.password = document.getElementById('login-password').value;
            serverDetails.type = 'auth';
            
            // Store current server details in state
            state.currentServer = { ...serverDetails };
            
            window.electronAPI.addServer(serverDetails);
            resetAndCloseModal();
        });

        // Add registration status handler
        window.electronAPI.onRegistrationStatus((status) => {
            if (status.success) {
                alert('Registration successful! You can now login.');
                // Switch to login tab
                const loginTab = modal.querySelector('.auth-tab[data-tab="login"]');
                loginTab.click();
            } else {
                alert(`Registration failed: ${status.error || 'Unknown error'}`);
            }
        });

        // Handle registration form submission
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            // Store connection details for later use after registration
            const connectionDetails = {
                ip: serverDetails.ip,
                port: serverDetails.port
            };

            serverDetails.username = document.getElementById('register-username').value;
            serverDetails.password = password;
            serverDetails.type = 'register';
            
            // Store current server details in state
            state.currentServer = { ...serverDetails };
            
            window.electronAPI.addServer(serverDetails);

            // Save connection details for login after registration
            window.electronAPI.onRegistrationStatus((status) => {
                if (status.success) {
                    alert('Registration successful! Please log in.');
                    // Switch to login tab and pre-fill username
                    const loginTab = modal.querySelector('.auth-tab[data-tab="login"]');
                    loginTab.click();
                    document.getElementById('login-username').value = serverDetails.username;
                    
                    // Restore connection details
                    serverDetails = { ...connectionDetails };
                } else {
                    alert(`Registration failed: ${status.error || 'Unknown error'}`);
                }
            });
        });

        function resetAndCloseModal() {
            connectionForm.reset();
            loginForm.reset();
            registerForm.reset();
            modal.style.display = 'none';
            serverDetails = {};
        }

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

    // Remove these static channel button handlers
    /* document.getElementById('general-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('general');
    });

    document.getElementById('chat-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('chat');
    }); */

    // Message input
    const messageInput = document.getElementById('message-input-field');

    // Server connection status handler
    window.electronAPI.onServerConnection((status) => {
        if (status.success) {
            const serverId = `${status.ip}:${status.port}`;
            const serverData = {
                id: serverId,
                name: status.username,
                ip: status.ip,
                port: status.port,
                username: status.username,
                channels: status.channels || ['general']
            };

            // Add server to state if not already present
            if (!state.servers.has(serverId)) {
                state.servers.set(serverId, serverData);
                
                // Create and add server icon
                const serverIcon = document.createElement('div');
                serverIcon.className = 'server-icon';
                serverIcon.textContent = status.username.substring(0, 2).toUpperCase();
                serverIcon.dataset.serverId = serverId;
                
                // Add click handler
                serverIcon.addEventListener('click', () => {
                    document.querySelectorAll('.server-icon').forEach(icon => 
                        icon.classList.remove('active'));
                    serverIcon.classList.add('active');
                    
                    state.currentServer = {
                        ip: status.ip,
                        port: status.port,
                        username: status.username
                    };
                    
                    updateServerContent(serverData);
                });
                
                document.querySelector('.servers-list').appendChild(serverIcon);

                // If this is the first server, automatically select it
                if (state.servers.size === 1) {
                    serverIcon.click();
                }
            }

            // Update current server state if this is the active server
            if (!state.currentServer || 
                (state.currentServer.ip === status.ip && 
                 state.currentServer.port === status.port)) {
                state.currentServer = {
                    ip: status.ip,
                    port: status.port,
                    username: status.username
                };
                state.currentUsername = status.username;
                document.getElementById('current-username').textContent = status.username;
            }
        } else {
            alert('Failed to connect to server');
        }
    });

    // Message display function
    function displayMessage(message) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                <span class="message-timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Chat message handler
    window.electronAPI.onChatMessage((message) => {
        displayMessage(message);
    });

    // Message input handler
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && messageInput.value.trim()) {
            const messageContent = messageInput.value.trim();
            // Check if we have an active server connection
            if (state.currentServer && state.currentServer.ip && state.currentServer.port) {
                const messageData = {
                    type: 'message',
                    channel: state.currentChannel,
                    content: messageContent,
                    username: state.currentUsername,
                    serverIp: state.currentServer.ip,
                    serverPort: state.currentServer.port
                };

                // Display message locally immediately
                displayMessage({
                    username: state.currentUsername,
                    content: messageContent,
                    timestamp: new Date().toISOString()
                });

                // Send to server
                window.electronAPI.sendMessage(messageData);
                
                // Clear input after sending
                messageInput.value = '';
            } else {
                console.error('No active server connection');
                alert('Please connect to a server first');
            }
        }
    });

    const serversList = document.querySelector('.servers-list');

    function removeExistingServer(serverId) {
        // Remove any existing server icons with the same ID
        const existingServer = document.querySelector(`.server-icon[data-server-id="${serverId}"]`);
        if (existingServer) {
            existingServer.remove();
        }
        // Remove from state if exists
        state.servers.delete(serverId);
    }

    // Handle new server connections (remove or modify this if not needed)
    window.electronAPI.onServerAdded((server) => {
        console.log('Server added:', server);
        // The server connection is now handled by onServerConnection
    });

    function updateServerContent(server) {
        // Update channel list
        const channelList = document.querySelector('.channel-list');
        channelList.innerHTML = `
            <div class="channel-category">
                <span>TEXT CHANNELS</span>
                ${server.channels.map(channel => `
                    <div class="channel" data-channel="${channel}">
                        <i class="fas fa-hashtag"></i>
                        <span>${channel}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers to all channels
        document.querySelectorAll('.channel').forEach(channelElement => {
            channelElement.addEventListener('click', () => {
                // Update active channel visual
                document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
                channelElement.classList.add('active');

                // Update state and UI
                const channelName = channelElement.dataset.channel;
                state.currentChannel = channelName;
                document.getElementById('current-channel').textContent = channelName;
                document.getElementById('message-input-field').placeholder = `Message #${channelName}`;
                
                // Request channel history
                if (state.currentServer) {
                    window.electronAPI.requestChannelHistory({
                        channel: channelName,
                        serverIp: state.currentServer.ip,
                        serverPort: state.currentServer.port
                    });
                }
            });

            // Set first channel as active by default
            if (channelElement === document.querySelector('.channel')) {
                channelElement.click();
            }
        });
    }

    // Add channel history handler
    window.electronAPI.onChannelHistory((data) => {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';
        
        if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach(message => {
                displayMessage(message);
            });
        }
    });

    // Add refresh button handler
    const refreshBtn = document.getElementById('refresh-servers');
    refreshBtn.addEventListener('click', async () => {
        // Add spinning animation
        refreshBtn.classList.add('refreshing');
        
        // Clear current servers
        const serversList = document.querySelector('.servers-list');
        serversList.innerHTML = '';
        state.servers.clear();

        try {
            // Request server refresh
            await window.electronAPI.refreshServers();
        } finally {
            // Remove spinning animation after a minimum time
            setTimeout(() => {
                refreshBtn.classList.remove('refreshing');
            }, 500);
        }
    });
});
