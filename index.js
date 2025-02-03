const BrowserWindow = require('electron').BrowserWindow

let AddServer = document.getElementById('add-server-btn');
AddServer.addEventListener('click', () => {
    console.log('Add Server Button Clicked');
});