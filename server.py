import asyncio
import json
import logging
from websockets.server import serve
from websockets.exceptions import ConnectionClosedOK
from dataclasses import dataclass, asdict
from typing import Dict, Set
from database import Database
from config_loader import load_config
import datetime

# Load configuration
config = load_config()
SERVER_HOST = config['SERVER_HOST']
SERVER_PORT = int(config['SERVER_PORT'])
DB_FILE = config['DB_FILE']

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class User:
    username: str
    password: str
    websocket: object
    status: str = "online"

class ChatServer:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.channels: Dict[str, Set[str]] = {}
        self.db = Database()
        asyncio.create_task(self.init_channels())

    async def init_channels(self):
        """Initialize channels from database."""
        channels = await self.db.get_channels()
        for channel in channels:
            self.channels[channel] = set()
        logger.info(f"Initialized channels: {list(self.channels.keys())}")

    async def register_user(self, username: str, password: str, websocket) -> bool:
        logger.info(f"Attempting to register user: {username}")
        if username in self.users:
            logger.warning(f"Registration failed: {username} already exists")
            return False
        
        # Store user in database
        if await self.db.add_user(username, password):
            self.users[username] = User(username, password, websocket)
            self.channels["general"].add(username)
            logger.info(f"User registered successfully: {username}")
            return True
        return False

    async def authenticate(self, username: str, password: str) -> bool:
        logger.info(f"Attempting to authenticate user: {username}")
        if await self.db.verify_user(username, password):
            if username not in self.users:
                # When a user joins, add them to all channels
                for channel in self.channels.keys():
                    self.channels[channel].add(username)
                return True
            return True
        return False

    async def broadcast(self, channel: str, message: dict, exclude: str = None):
        """Broadcast a message to all users in a channel except the sender"""
        if channel in self.channels:
            for username in self.channels[channel]:
                if username != exclude and username in self.users:
                    user = self.users[username]
                    try:
                        await user.websocket.send(json.dumps(message))
                    except Exception as e:
                        logger.error(f"Error broadcasting to {username}: {e}")

    async def handle_message(self, websocket, message_data: dict):
        message_type = message_data.get("type")
        
        if message_type == "register":
            username = message_data.get("username")
            password = message_data.get("password")
            
            if not username or not password:
                await websocket.send(json.dumps({
                    "type": "register_response",
                    "success": False,
                    "error": "Invalid registration details"
                }))
                return

            success = await self.register_user(username, password, websocket)
            response = {
                "type": "register_response",
                "success": success,
                "error": "Username already exists" if not success else None
            }
            logger.debug(f"Sending registration response: {response}")
            await websocket.send(json.dumps(response))

        elif message_type == "auth":
            username = message_data.get("username")
            password = message_data.get("password")
            
            if not username or not password:
                await websocket.send(json.dumps({
                    "type": "auth_response",
                    "success": False,
                    "error": "Invalid credentials"
                }))
                return

            success = await self.authenticate(username, password)
            
            if success:
                # Update websocket for user
                self.users[username] = User(username, password, websocket)
                self.channels["general"].add(username)
                
                # Get history for the default channel
                history = await self.db.get_channel_history("general")
                
                response = {
                    "type": "auth_response",
                    "success": True,
                    "username": username,
                    "channels": list(self.channels.keys()),
                    "history": history,  # Include message history
                    "current_channel": "general"
                }
            else:
                response = {
                    "type": "auth_response",
                    "success": False,
                    "error": "Authentication failed"
                }
            
            logger.debug(f"Sending auth response: {response}")
            await websocket.send(json.dumps(response))

        elif message_type == "message":
            channel = message_data.get("channel", "general")
            username = message_data.get("username")
            content = message_data.get("content")
            
            if username in self.users and channel in self.channels:
                timestamp = datetime.datetime.now().isoformat()
                # Create message object
                message = {
                    "type": "message",
                    "channel": channel,
                    "username": username,
                    "content": content,
                    "timestamp": timestamp
                }
                
                # Store in database
                if await self.db.add_message(channel, username, content):
                    # Only broadcast to other users
                    await self.broadcast(channel, message, exclude=username)
                else:
                    logger.error("Failed to store message in database")

        elif message_type == "get_channel_history":
            channel = message_data.get("channel", "general")
            if channel in self.channels:
                history = await self.db.get_channel_history(channel)
                await websocket.send(json.dumps({
                    "type": "channel_history",
                    "channel": channel,
                    "messages": history
                }))

    async def handle_connection(self, websocket):
        logger.info(f"New connection from {websocket.remote_address}")
        try:
            async for message in websocket:
                try:
                    message_data = json.loads(message)
                    await self.handle_message(websocket, message_data)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON received: {e}")
                except Exception as e:
                    logger.error(f"Error handling message: {e}", exc_info=True)
        except ConnectionClosedOK:
            logger.info(f"Connection closed normally from {websocket.remote_address}")
            # Clean up user on disconnect
            for username, user in list(self.users.items()):
                if user.websocket == websocket:
                    del self.users[username]
                    for channel in self.channels.values():
                        channel.discard(username)
                    break
        except Exception as e:
            logger.error(f"Connection error: {e}", exc_info=True)

async def main():
    server = ChatServer()
    logger.info(f"Starting server on ws://{SERVER_HOST}:{SERVER_PORT}")
    async with serve(server.handle_connection, SERVER_HOST, SERVER_PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutting down")
    except Exception as e:
        logger.error("Server error:", exc_info=True)
