import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes, Options } from 'sequelize';
import process from 'process';
import config from '../config/config';

import AuditLogModel from './auditlog';
import BackupModel from './backup';
import BackupReminderModel from './backupreminder';
import ProfileModel from './profile';
import RoleModel from './role';
import StationModel from './station';
import UserModel from './user';

const env = (process.env.NODE_ENV as keyof typeof config) || 'development';
const dbConfig = config[env];

let sequelize: Sequelize;
if (dbConfig.use_env_variable && process.env[dbConfig.use_env_variable]) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable] as string, dbConfig as Options);
} else {
  sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig as Options);
}

// Initialize all models
const AuditLog = AuditLogModel(sequelize);
const Backup = BackupModel(sequelize);
const BackupReminder = BackupReminderModel(sequelize);
const Profile = ProfileModel(sequelize);
const Role = RoleModel(sequelize);
const Station = StationModel(sequelize);
const User = UserModel(sequelize);

const db: any = {
  AuditLog,
  Backup,
  BackupReminder,
  Profile,
  Role,
  Station,
  User,
  sequelize,
  Sequelize
};

// Set up associations
Role.associate(db);
User.associate(db);
Station.associate(db);
Profile.associate(db);
Backup.associate(db);
BackupReminder.associate(db);
AuditLog.associate(db);

export default db;
