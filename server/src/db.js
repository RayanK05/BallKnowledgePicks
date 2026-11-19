const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });const { Pool } = require('pg');
const pool = new Pool();
module.exports = pool;