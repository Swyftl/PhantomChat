const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    addServer: () => ipcRenderer.send('add-server'),
    switchServer: (serverId) => ipcRenderer.send('switch-server', serverId),
    switchChannel: (channelId) => ipcRenderer.send('switch-channel', channelId),
    sendMessage: (message) => ipcRenderer.send('send-message', message)
});