require('dotenv').config();
const pool = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

pool.connect()
  .then((client) => {
    client.release();
    console.log('PostgreSQL connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  });
