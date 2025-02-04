import logging  # Add this import
import sqlite3
import aiosqlite
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_file="chat.db"):
        self.db_file = db_file
        self.init_database()

    def init_database(self):
        """Initialize the database and create tables if they don't exist."""
        try:
            with sqlite3.connect(self.db_file) as conn:
                cursor = conn.cursor()
                
                # Create users table
                cursor.execute('''CREATE TABLE IF NOT EXISTS users
                    (username TEXT PRIMARY KEY, password TEXT)''')

                # Create messages table
                cursor.execute('''CREATE TABLE IF NOT EXISTS messages
                    (id INTEGER PRIMARY KEY AUTOINCREMENT,
                     channel TEXT,
                     username TEXT,
                     content TEXT,
                     timestamp DATETIME,
                     FOREIGN KEY(username) REFERENCES users(username))''')

                conn.commit()
                logger.info("Database initialized successfully")
        except sqlite3.Error as e:
            logger.error(f"Database initialization error: {e}")

    async def add_user(self, username: str, password: str) -> bool:
        """Add a new user to the database."""
        try:
            with sqlite3.connect(self.db_file) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO users (username, password) VALUES (?, ?)",
                    (username, password)
                )
                conn.commit()
                return True
        except sqlite3.IntegrityError:
            logger.warning(f"User {username} already exists")
            return False
        except sqlite3.Error as e:
            logger.error(f"Error adding user: {e}")
            return False

    async def verify_user(self, username: str, password: str) -> bool:
        """Verify user credentials."""
        try:
            with sqlite3.connect(self.db_file) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT password FROM users WHERE username = ?",
                    (username,)
                )
                result = cursor.fetchone()
                return result is not None and result[0] == password
        except sqlite3.Error as e:
            logger.error(f"Error verifying user: {e}")
            return False

    async def add_message(self, channel: str, username: str, content: str) -> bool:
        """Store a message in the database."""
        try:
            async with aiosqlite.connect(self.db_file) as db:
                await db.execute('''
                    INSERT INTO messages (channel, username, content, timestamp)
                    VALUES (?, ?, ?, ?)
                ''', (channel, username, content, datetime.now().isoformat()))
                await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error storing message: {e}")
            return False

    async def get_channel_history(self, channel: str, limit: int = 50) -> list:
        """Retrieve message history for a channel."""
        try:
            async with aiosqlite.connect(self.db_file) as db:
                async with db.execute('''
                    SELECT username, content, timestamp
                    FROM messages
                    WHERE channel = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (channel, limit)) as cursor:
                    messages = await cursor.fetchall()
                    return [
                        {
                            'type': 'message',
                            'channel': channel,
                            'username': msg[0],
                            'content': msg[1],
                            'timestamp': msg[2]
                        }
                        for msg in reversed(messages)  # Reverse to get chronological order
                    ]
        except Exception as e:
            logger.error(f"Error retrieving channel history: {e}")
            return []
