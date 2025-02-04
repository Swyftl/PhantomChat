const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const WebSocketClient = require('./websocket-client');
const { w3cwebsocket: WebSocket } = require('websocket');  // Add this line
const configManager = require('./config-manager');

let mainWindow = null;
let wsClients = new Map();
let connectedServers = new Set(); // Track connected servers

async function createWindow() {
    try {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        // Load the index.html file
        await mainWindow.loadFile('index.html');
        
        // Connect to saved servers after window loads
        const config = await configManager.loadConfig();
        config.servers.forEach(server => {
            connectToServer(server, mainWindow.webContents);
        });

        // Debug: Open DevTools
        mainWindow.webContents.openDevTools();
    } catch (error) {
        console.error('Error creating window:', error);
    }
}

// Ensure app is ready before creating window
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    connectedServers.clear();
    wsClients.forEach(client => client.close());
    wsClients.clear();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function connectToServer(serverDetails, sender) {
    const serverId = `${serverDetails.ip}:${serverDetails.port}`;
    
    // Check if server is already connected
    if (connectedServers.has(serverId)) {
        console.log('Server already connected:', serverId);
        // Send existing server info to update UI
        sender.send('server-added', {
            id: serverId,
            name: serverDetails.username,
            channels: wsClients.get(serverId)?.channels || ['general', 'chat']
        });
        return;
    }

    const url = `ws://${serverDetails.ip}:${serverDetails.port}`;
    
    if (wsClients.has(serverId)) {
        wsClients.get(serverId).close();
    }

    const wsClient = new WebSocketClient(url, serverDetails);
    wsClients.set(serverId, wsClient);

    // Add message handler
    wsClient.on('message', (message) => {
        console.log('Received chat message:', message);
        sender.send('chat-message', message);
    });

    // Consolidated auth response handler
    wsClient.on('auth_response', (response) => {
        console.log('Received auth response:', response);
        if (response.success) {
            console.log('Authentication successful');
            
            // Only add to connected servers if not already connected
            if (!connectedServers.has(serverId)) {
                configManager.addServer(serverDetails);
                connectedServers.add(serverId);
                
                sender.send('server-added', {
                    id: serverId,
                    name: serverDetails.username,
                    channels: response.channels,
                    username: serverDetails.username
                });
            }

            sender.send('server-connection-status', {
                success: true,
                username: serverDetails.username,
                channels: response.channels,
                ip: serverDetails.ip,
                port: serverDetails.port
            });
        } else {
            console.error('Authentication failed:', response.error);
            sender.send('server-connection-status', {
                success: false,
                error: response.error || 'Authentication failed'
            });
        }
    });

    wsClient.on('register_response', (response) => {
        console.log('Received registration response:', response);
        sender.send('registration-status', {
            success: response.success,
            error: response.error
        });

        // Clear credentials after registration
        wsClient.options.username = null;
        wsClient.options.password = null;
    });

    // Add channel history handler
    wsClient.on('channel_history', (data) => {
        console.log('Received channel history:', data);
        sender.send('channel-history', data);
    });

    wsClient.connect();

    // Wait for connection before sending auth/register request
    wsClient.on('connected', () => {
        if (serverDetails.type === 'register') {
            console.log('Sending registration request');
            wsClient.register(serverDetails.username, serverDetails.password);
        } else if (serverDetails.type === 'auth') {
            console.log('Sending authentication request');
            wsClient.authenticate(serverDetails.username, serverDetails.password);
        }
    });

    // Handle request for channel history
    ipcMain.on('request-channel-history', (event, data) => {
        const serverId = `${data.serverIp}:${data.serverPort}`;
        const wsClient = wsClients.get(serverId);
        if (wsClient) {
            wsClient.send({
                type: 'get_channel_history',
                channel: data.channel
            });
        }
    });
}

// Update IPC handlers
ipcMain.on('add-server', (event, data) => {
    connectToServer(data, event.sender);
});

ipcMain.on('send-message', (event, data) => {
    const serverId = `${data.serverIp}:${data.serverPort}`;
    const wsClient = wsClients.get(serverId);
    if (wsClient) {
        wsClient.send({
            type: 'message',
            channel: data.channel,
            content: data.content,
            username: data.username
        });
    }
});

ipcMain.on('switch-server', (event, serverId) => {
    const wsClient = wsClients.get(serverId);
    if (wsClient) {
        // If client exists but not connected, reconnect
        if (wsClient.ws?.readyState !== WebSocket.OPEN) {
            wsClient.connect();
        }
        
        // Send current server state to renderer
        event.sender.send('server-connection-status', {
            success: true,
            username: wsClient.options.username,
            channels: wsClient.channels || ['general', 'chat'],
            ip: wsClient.options.ip,
            port: wsClient.options.port
        });
    }
});

ipcMain.on('switch-channel', (event, channelName) => {
    const serverId = findActiveServerId();
    const wsClient = wsClients.get(serverId);
    if (wsClient) {
        wsClient.switchChannel(channelName);
    }
});

function findActiveServerId() {
    // Return the first connected server ID
    for (const [serverId, client] of wsClients.entries()) {
        if (client.ws?.readyState === WebSocket.OPEN) {
            return serverId;
        }
    }
    return null;
}

// Handle modal file loading
ipcMain.handle('load-modal-file', async (event, modalName) => {
    try {
        const modalPath = path.join(__dirname, 'modals', `${modalName}-modal.html`);
        const content = await fs.readFile(modalPath, 'utf8');
        return content;
    } catch (error) {
        console.error('Error loading modal file:', error);
        return null;
    }
});