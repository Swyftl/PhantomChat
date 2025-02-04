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

    // Channel buttons
    document.getElementById('general-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('general');
    });

    document.getElementById('chat-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('chat');
    });

    // Message input
    const messageInput = document.getElementById('message-input-field');

    // Server connection status handler
    window.electronAPI.onServerConnection((status) => {
        if (status.success) {
            // Create server icon using status data
            const serverIcon = document.createElement('div');
            serverIcon.className = 'server-icon';
            serverIcon.textContent = status.username.substring(0, 2).toUpperCase();
            const serverId = `${status.ip}:${status.port}`;  // Use status data instead of state
            serverIcon.dataset.serverId = serverId;
            
            // Remove existing server icon if it exists
            const existingServer = document.querySelector(
                `.server-icon[data-server-id="${serverId}"]`
            );
            if (existingServer) {
                existingServer.remove();
            }
            
            // Update state with server information
            state.currentServer = {
                ip: status.ip,
                port: status.port,
                username: status.username
            };
            
            document.querySelector('.servers-list').appendChild(serverIcon);
            
            // Update username display
            state.currentUsername = status.username;
            document.getElementById('current-username').textContent = state.currentUsername;

            // Clear and load message history if provided
            const messagesContainer = document.getElementById('messages-container');
            messagesContainer.innerHTML = '';
            
            if (status.history && Array.isArray(status.history)) {
                status.history.forEach(message => {
                    displayMessage(message);
                });
            }

            // Set general channel as active by default
            const generalChannel = document.getElementById('general-channel');
            if (generalChannel) {
                document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
                generalChannel.classList.add('active');
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

    // Handle new server connections
    window.electronAPI.onServerAdded((server) => {
        console.log('Adding server:', server);
        
        // Remove existing instance if any
        removeExistingServer(server.id);

        const serverIcon = document.createElement('div');
        serverIcon.className = 'server-icon';
        serverIcon.textContent = server.name.substring(0, 2).toUpperCase();
        serverIcon.dataset.serverId = server.id;
        
        serverIcon.addEventListener('click', () => {
            // Switch active server
            document.querySelectorAll('.server-icon').forEach(icon => 
                icon.classList.remove('active'));
            serverIcon.classList.add('active');
            
            // Switch to this server
            const serverData = state.servers.get(server.id);
            if (serverData) {
                state.currentServer = {
                    ip: serverData.ip,
                    port: serverData.port,
                    username: serverData.username
                };
                window.electronAPI.switchServer(server.id);
                updateServerContent(serverData);
            }
        });

        serversList.appendChild(serverIcon);
        state.servers.set(server.id, server);
        console.log('Current servers:', state.servers);
    });

    function updateServerContent(server) {
        // Update channel list
        const channelList = document.querySelector('.channel-list');
        channelList.innerHTML = server.channels.map(channel => `
            <div class="channel" data-channel="${channel}">
                <i class="fas fa-hashtag"></i>
                <span>${channel}</span>
            </div>
        `).join('');

        // Add click handlers to all channels
        document.querySelectorAll('.channel').forEach(channelElement => {
            // Mark general as active by default for new servers
            if (channelElement.dataset.channel === 'general') {
                channelElement.classList.add('active');
            }
            
            channelElement.addEventListener('click', () => {
                // Update active channel visual
                document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
                channelElement.classList.add('active');

                // Update state and UI
                const channelName = channelElement.dataset.channel;
                state.currentChannel = channelName;
                document.getElementById('current-channel').textContent = channelName;
                document.getElementById('message-input-field').placeholder = `Message #${channelName}`;
                
                // Clear messages container for new channel
                document.getElementById('messages-container').innerHTML = '';

                // Request channel history
                if (state.currentServer) {
                    window.electronAPI.requestChannelHistory({
                        channel: channelName,
                        serverIp: state.currentServer.ip,
                        serverPort: state.currentServer.port
                    });
                }
            });
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

    // Update the built-in channel buttons to use the same logic
    document.getElementById('general-channel').addEventListener('click', () => {
        // Update active channel visual
        document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
        document.getElementById('general-channel').classList.add('active');
        
        // Update state and UI
        state.currentChannel = 'general';
        document.getElementById('current-channel').textContent = 'general';
        document.getElementById('message-input-field').placeholder = 'Message #general';
        
        // Clear and request history
        document.getElementById('messages-container').innerHTML = '';
        if (state.currentServer) {
            window.electronAPI.requestChannelHistory({
                channel: 'general',
                serverIp: state.currentServer.ip,
                serverPort: state.currentServer.port
            });
        }
    });

    document.getElementById('chat-channel').addEventListener('click', () => {
        // Update active channel visual
        document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
        document.getElementById('chat-channel').classList.add('active');
        
        // Update state and UI
        state.currentChannel = 'chat';
        document.getElementById('current-channel').textContent = 'chat';
        document.getElementById('message-input-field').placeholder = 'Message #chat';
        
        // Clear and request history
        document.getElementById('messages-container').innerHTML = '';
        if (state.currentServer) {
            window.electronAPI.requestChannelHistory({
                channel: 'chat',
                serverIp: state.currentServer.ip,
                serverPort: state.currentServer.port
            });
        }
    });
});
