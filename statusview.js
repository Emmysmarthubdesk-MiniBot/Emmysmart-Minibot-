const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database/status.json');

const load = () => {
    if (!fs.existsSync(dbPath)) return { view: false, react: false };
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
};

const save = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { load, save };