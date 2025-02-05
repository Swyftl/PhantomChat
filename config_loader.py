import os
import logging

logger = logging.getLogger(__name__)

def load_config(config_file='config.env'):
    """
    Load configuration from config.env file.
    Returns a dictionary with configuration values.
    """
    config = {
        'SERVER_HOST': 'localhost',  # default values
        'SERVER_PORT': '8080',
        'DB_FILE': 'chat.db'
    }
    
    try:
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        try:
                            key, value = line.split('=', 1)
                            config[key.strip()] = value.strip()
                        except ValueError:
                            logger.warning(f"Invalid config line: {line}")
        else:
            logger.warning(f"Config file {config_file} not found, using defaults")
            # Create default config file if it doesn't exist
            with open(config_file, 'w') as f:
                f.write("""# Server Configuration
SERVER_HOST=localhost
SERVER_PORT=8080

# Database Configuration
DB_FILE=chat.db
""")
    except Exception as e:
        logger.error(f"Error loading config: {e}, using defaults")
    
    return config

def save_config(config, config_file='config.env'):
    """
    Save configuration to config.env file.
    """
    try:
        with open(config_file, 'w') as f:
            f.write("# Server Configuration\n")
            f.write(f"SERVER_HOST={config['SERVER_HOST']}\n")
            f.write(f"SERVER_PORT={config['SERVER_PORT']}\n\n")
            f.write("# Database Configuration\n")
            f.write(f"DB_FILE={config['DB_FILE']}\n")
        return True
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        return False
