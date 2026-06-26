const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database/autoreact.json');

const load = () => {
    // Ensure database directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
        // Sets default state and default emoji if file doesn't exist
        const defaultData = { enabled: false, emoji: '❤️' };
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        // Safety fallback if the data exists but lacks an emoji property
        if (!data.emoji) data.emoji = '❤️';
        return data;
    } catch {
        return { enabled: false, emoji: '❤️' };
    }
};

const save = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { load, save };
