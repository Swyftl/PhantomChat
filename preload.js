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
    sendMessage: (message) => ipcRenderer.send('send-message', message)
});