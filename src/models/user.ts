import { DataTypes, Model, Sequelize, Association } from 'sequelize';

interface UserAttributes {
  id?: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  status: 'active' | 'inactive';
  roleId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public username!: string;
  public password!: string;
  public status!: 'active' | 'inactive';
  public roleId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association mixins
  public role?: any;
  public stations?: any[];
  public auditLogs?: any[];

  public static associations: {
    role: Association<User, any>;
    stations: Association<User, any>;
    auditLogs: Association<User, any>;
  };

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    User.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role'
    });
    User.hasMany(models.Station, {
      foreignKey: 'createdBy',
      as: 'stations'
    });
    User.hasMany(models.AuditLog, {
      foreignKey: 'userId',
      as: 'auditLogs'
    });
  }
}

export default (sequelize: Sequelize) => {
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    },
    roleId: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
