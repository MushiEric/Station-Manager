import { DataTypes, Model, Sequelize } from 'sequelize';

interface AuditLogAttributes {
  id?: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: Date;
  ipAddress: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuditLogCreationAttributes extends Omit<AuditLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public userId!: string;
  public action!: string;
  public targetType!: string;
  public targetId!: string;
  public timestamp!: Date;
  public ipAddress!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
}

export default (sequelize: Sequelize) => {
  AuditLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: DataTypes.UUID,
    action: DataTypes.STRING,
    targetType: DataTypes.STRING,
    targetId: DataTypes.UUID,
    timestamp: DataTypes.DATE,
    ipAddress: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'AuditLog',
  });
  return AuditLog;
};
