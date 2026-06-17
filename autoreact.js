const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database/autoreact.json');

const load = () => {
    if (!fs.existsSync(dbPath)) {
        const defaultData = { enabled: false };
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {
        return { enabled: false };
    }
};

const save = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { load, save };