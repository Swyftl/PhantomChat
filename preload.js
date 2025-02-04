const { contextBridge, ipcRenderer } = require('electron');

// Remove duplicate methods and clean up the API exposure
contextBridge.exposeInMainWorld('electronAPI', {
    addServer: (data) => ipcRenderer.send('add-server', data),
    sendMessage: (data) => ipcRenderer.send('send-message', data),
    switchServer: (serverId) => ipcRenderer.send('switch-server', serverId),
    switchChannel: (channelId) => ipcRenderer.send('switch-channel', channelId),
    setTheme: (theme) => ipcRenderer.send('set-theme', theme),
    setPrivacySetting: (setting, value) => ipcRenderer.send('set-privacy-setting', { setting, value }),
    loadModalFile: (modalName) => ipcRenderer.invoke('load-modal-file', modalName),
    requestChannelHistory: (data) => ipcRenderer.send('request-channel-history', data),
    refreshServers: () => ipcRenderer.invoke('refresh-servers'),
    
    // Event listeners
    onServerConnection: (callback) => 
        ipcRenderer.on('server-connection-status', (_, status) => callback(status)),
    onChatMessage: (callback) => ipcRenderer.on('chat-message', (event, message) => callback(message)),
    onRegistrationStatus: (callback) =>
        ipcRenderer.on('registration-status', (_, status) => callback(status)),
    onServerAdded: (callback) =>
        ipcRenderer.on('server-added', (_, server) => callback(server)),
    onChannelHistory: (callback) => 
        ipcRenderer.on('channel-history', (_, data) => callback(data))
});