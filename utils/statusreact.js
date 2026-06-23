const fs = require('fs');
const path = require('path');
const dbpath = path.join(__dirname, '../database/statusreact.json');

const load = () => {
    if (!fs.existsSync(dbpath)) return { enabled: false };
    return JSON.parse(fs.readFileSync(dbpath, 'utf-8'));
};

const save = (data) => {
    fs.writeFileSync(dbpath, JSON.stringify(data, null, 2));
};

module.exports = { load, save };