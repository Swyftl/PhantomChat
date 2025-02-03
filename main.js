const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const WebSocketClient = require('./websocket-client');

let wsClient = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle IPC events
ipcMain.on('add-server', (event, data) => {
    console.log('Attempting to connect to server:', data);
    const url = `ws://${data.ip}:${data.port}`;
    
    if (wsClient) {
        console.log('Closing existing connection');
        wsClient.close();
    }

    wsClient = new WebSocketClient(url, {
        username: data.username,
        password: data.password
    });

    wsClient.on('auth_response', (response) => {
        console.log('Received auth response:', response);
        if (response.success) {
            console.log('Authentication successful');
            event.reply('server-connection-status', {
                success: true,
                username: response.username,
                channels: response.channels
            });
        } else {
            console.error('Authentication failed:', response.error);
            event.reply('server-connection-status', {
                success: false,
                error: response.error || 'Authentication failed'
            });
        }
    });

    wsClient.on('message', (message) => {
        console.log('Received chat message:', message);
        event.reply('chat-message', message);
    });

    wsClient.connect();
});

ipcMain.on('send-message', (event, data) => {
    if (wsClient) {
        wsClient.send({
            type: 'message',
            channel: data.channel,
            content: data.content,
            username: data.username
        });
    }
});

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