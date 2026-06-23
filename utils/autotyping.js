const fs = require('fs');
const path = require('path');
const dbpath = path.join(__dirname, '../database/autotyping.json');

const dbDir = path.dirname(dbpath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const load = () => {
  if (!fs.existsSync(dbpath)) {
    const defaultData = { enabled: false };
    fs.writeFileSync(dbpath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(dbpath, 'utf-8'));
};

const save = (data) => fs.writeFileSync(dbpath, JSON.stringify(data, null, 2));

module.exports = { load, save };