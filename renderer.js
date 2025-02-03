document.addEventListener('DOMContentLoaded', () => {
    // Server buttons
    document.getElementById('add-server-btn').addEventListener('click', () => {
        console.log('Add server clicked');

    });

    document.getElementById('home-server').addEventListener('click', () => {
        console.log('Home server clicked');
    });

    document.getElementById('phantom-server').addEventListener('click', () => {
        console.log('Phantom server clicked');
    });

    // Channel buttons
    document.getElementById('general-channel').addEventListener('click', () => {
        console.log('General channel clicked');
    });

    document.getElementById('chat-channel').addEventListener('click', () => {
        console.log('Chat channel clicked');
    });

    // Message input
    const messageInput = document.getElementById('message-input-field');
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Message sent:', messageInput.value);
            messageInput.value = '';
        }
    });
});
