const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(process.cwd(), 'data', 'itineraries.db'));

module.exports = db;