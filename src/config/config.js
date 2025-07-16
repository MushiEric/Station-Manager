require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'omboza',
    database: process.env.DB_NAME || 'backup_manager_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: console.log
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'omboza',
    database: process.env.DB_NAME_TEST || 'backup_manager_test',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'omboza',
    database: process.env.DB_NAME || 'backup_manager_prod',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false
  }
};
