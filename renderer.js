document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('add-server-modal');
    const addServerBtn = document.getElementById('add-server-btn');
    const closeModal = document.querySelector('.close-modal');
    const connectionForm = document.getElementById('server-connection-form');
    const authForm = document.getElementById('server-auth-form');
    const backBtn = document.querySelector('.back-btn');

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

    // Channel buttons
    document.getElementById('general-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('general');
    });

    document.getElementById('chat-channel').addEventListener('click', () => {
        window.electronAPI.switchChannel('chat');
    });

    // Message input
    const messageInput = document.getElementById('message-input-field');
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && messageInput.value.trim()) {
            window.electronAPI.sendMessage(messageInput.value);
            messageInput.value = '';
        }
    });
});
