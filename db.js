const mysql = require('mysql2/promise');
require('dotenv').config();
const pool = mysql.createPool({
host: process.env.MYSQL_HOST || 'localhost',
user: process.env.MYSQL_USER || 'root',
//password: process.env.MYSQL_PASS || '',
database: process.env.MYSQL_DB || 'contestdb',
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0
});


module.exports = pool;