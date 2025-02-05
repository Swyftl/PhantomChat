const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, 'config.json');
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Return default config if file doesn't exist
            return { servers: [] };
        }
    }

    async saveConfig(config) {
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    }

    async addServer(serverDetails) {
        const config = await this.loadConfig();
        
        // Check if server already exists
        const existingServer = config.servers.find(s => 
            s.ip === serverDetails.ip && 
            s.port === serverDetails.port &&
            s.username === serverDetails.username
        );

        if (!existingServer) {
            config.servers.push({
                ip: serverDetails.ip,
                port: serverDetails.port,
                username: serverDetails.username,
                password: serverDetails.password // Consider encrypting this
            });
            await this.saveConfig(config);
        }
    }

    async loadSettings() {
        const config = await this.loadConfig();
        return config.settings || {
            theme: 'dark',
            fontSize: 14,
            reduceMotion: false,
            highContrast: false,
            notifications: {
                enabled: true,
                messages: true,
                statusChanges: true
            }
        };
    }

    async saveSettings(settings) {
        const config = await this.loadConfig();
        config.settings = settings;
        await this.saveConfig(config);
    }
}

module.exports = new ConfigManager();
