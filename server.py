import asyncio
import json
import logging
from websockets.server import serve
from websockets.exceptions import ConnectionClosedOK
from dataclasses import dataclass, asdict
from typing import Dict, Set

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
        self.channels: Dict[str, Set[str]] = {
            "general": set(),
            "chat": set()
        }

    async def register_user(self, username: str, password: str, websocket) -> bool:
        logger.info(f"Attempting to register user: {username}")
        if username in self.users:
            logger.warning(f"Registration failed: {username} already exists")
            return False
        
        self.users[username] = User(username, password, websocket)
        self.channels["general"].add(username)
        logger.info(f"User registered successfully: {username}")
        return True

    async def authenticate(self, username: str, password: str) -> bool:
        logger.info(f"Attempting to authenticate user: {username}")
        if username not in self.users:
            # Auto-register if user doesn't exist
            return await self.register_user(username, password, None)
        auth_success = self.users[username].password == password
        logger.info(f"Authentication {'successful' if auth_success else 'failed'} for: {username}")
        return auth_success

    async def broadcast(self, channel: str, message: dict, exclude: str = None):
        for username in self.channels[channel]:
            if username != exclude:
                user = self.users[username]
                await user.websocket.send(json.dumps(message))

    async def handle_message(self, websocket, message_data: dict):
        logger.debug(f"Received message: {message_data}")
        message_type = message_data.get("type")
        
        if message_type == "register":
            success = await self.register_user(
                message_data["username"],
                message_data["password"],
                websocket
            )
            await websocket.send(json.dumps({
                "type": "register_response",
                "success": success
            }))

        elif message_type == "auth":
            username = message_data.get("username")
            password = message_data.get("password")
            success = await self.authenticate(username, password)
            
            if success:
                # Update websocket if user exists
                if username in self.users:
                    self.users[username].websocket = websocket
                
                response = {
                    "type": "auth_response",
                    "success": True,
                    "username": username,
                    "channels": list(self.channels.keys())
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
            username = message_data["username"]
            channel = message_data["channel"]
            if username in self.users and channel in self.channels:
                await self.broadcast(channel, {
                    "type": "message",
                    "channel": channel,
                    "username": username,
                    "content": message_data["content"]
                }, username)
            logger.debug(f"Broadcasting message in channel {message_data.get('channel')}")

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
    logger.info("Starting server on ws://localhost:8080")
    async with serve(server.handle_connection, "localhost", 8080):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutting down")
    except Exception as e:
        logger.error("Server error:", exc_info=True)
