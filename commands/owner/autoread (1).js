/**
 * utils/autoread.js
 */
const fs = require('fs');
const path = require('path');

// Path to your configuration file
const configPath = path.join(__dirname, '..', 'data', 'autoread.json');

// Ensure config exists
function initConfig() {
    if (!fs.existsSync(path.dirname(configPath))) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Function used by index.js to check if feature is on
function isAutoreadEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('Error checking autoread status:', error);
        return false;
    }
}

module.exports = { isAutoreadEnabled };