const fs = require('fs');
const path = require('path');

const initializeTempSystem = () => {
    const tmpDir = path.join(__dirname, '../tmp');
    
    // Create the tmp directory if it doesn't exist
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
};

module.exports = { initializeTempSystem };
