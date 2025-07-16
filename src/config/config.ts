import { Dialect } from 'sequelize';

interface DatabaseConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  dialect: Dialect;
  use_env_variable?: string;
}

interface Config {
  development: DatabaseConfig;
  test: DatabaseConfig;
  production: DatabaseConfig;
}

const config: Config = {
  development: {
    username: 'root',
    password: 'omboza',
    database: 'backup_manager_dev',
    host: '127.0.0.1',
    dialect: 'mysql' as Dialect
  },
  test: {
    username: 'root',
    password: 'omboza',
    database: 'backup_manager_test',
    host: '127.0.0.1',
    dialect: 'mysql' as Dialect
  },
  production: {
    username: 'root',
    password: 'omboza',
    database: 'backup_manager_prod',
    host: '127.0.0.1',
    dialect: 'mysql' as Dialect
  }
};

export default config;
