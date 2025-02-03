const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    addServer: (data) => ipcRenderer.send('add-server', {
        ip: data.ip,
        port: data.port,
        username: data.username,
        password: data.password
    }),
    switchServer: (serverId) => ipcRenderer.send('switch-server', serverId),
    switchChannel: (channelId) => ipcRenderer.send('switch-channel', channelId),
    sendMessage: (message) => ipcRenderer.send('send-message', message),
    setTheme: (theme) => ipcRenderer.send('set-theme', theme),
    setPrivacySetting: (setting, value) => ipcRenderer.send('set-privacy-setting', { setting, value }),
    loadModalFile: (modalName) => ipcRenderer.invoke('load-modal-file', modalName),

    // WebSocket related methods
    addServer: (data) => ipcRenderer.send('add-server', data),
    sendMessage: (data) => ipcRenderer.send('send-message', data),
    onServerConnection: (callback) => 
        ipcRenderer.on('server-connection-status', (_, status) => callback(status)),
    onChatMessage: (callback) =>
        ipcRenderer.on('chat-message', (_, message) => callback(message))
});