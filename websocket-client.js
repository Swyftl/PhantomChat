const WebSocket = require('websocket').w3cwebsocket;

class WebSocketClient {
    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.ws = null;
        this.messageHandlers = new Map();
        console.log('WebSocketClient initialized with:', { url, username: options.username });
    }

    connect() {
        console.log('Attempting to connect to:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WebSocket connection established');
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

    authenticate(username, password) {
        this.send({
            type: 'auth',
            username,
            password
        });
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending message:', message);
            this.ws.send(JSON.stringify(message));
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
