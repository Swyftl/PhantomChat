const WebSocket = require('websocket').w3cwebsocket;

class WebSocketClient {
    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.ws = null;
        this.messageHandlers = new Map();
        this.currentChannel = 'general';
        console.log('WebSocketClient initialized with:', { url, username: options.username });
    }

    connect() {
        // Close existing connection if any
        if (this.ws) {
            this.ws.close();
        }

        console.log('Attempting to connect to:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            // Emit connected event
            const handler = this.messageHandlers.get('connected');
            if (handler) handler();
            
            // Authenticate if we have credentials
            if (this.options.username && this.options.password) {
                console.log('Attempting authentication for:', this.options.username);
                this.authenticate(this.options.username, this.options.password);
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Received message:', message);
                const handler = this.messageHandlers.get(message.type);
                if (handler) {
                    handler(message);
                } else {
                    console.log('No handler for message type:', message.type);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    }

    register(username, password) {
        console.log('Sending registration request for:', username);
        this.send({
            type: 'register',
            username,
            password
        });
    }

    authenticate(username, password) {
        console.log('Sending authentication request for:', username);
        this.send({
            type: 'auth',
            username,
            password
        });
    }

    switchChannel(channelName) {
        this.currentChannel = channelName;
        console.log('Switched to channel:', channelName);
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending message:', message);
            this.ws.send(JSON.stringify({
                ...message,
                username: this.options.username,
                channel: message.channel || this.currentChannel
            }));
        } else {
            console.error('Cannot send message, WebSocket is not open. ReadyState:', this.ws?.readyState);
        }
    }

    on(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

module.exports = WebSocketClient;
