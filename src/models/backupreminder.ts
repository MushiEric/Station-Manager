import { DataTypes, Model, Sequelize } from 'sequelize';

interface BackupReminderAttributes {
  id?: string;
  stationId: string;
  reminderDate: Date;
  isResolved: boolean;
  message: string;
  notifiedTo: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BackupReminderCreationAttributes extends Omit<BackupReminderAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class BackupReminder extends Model<BackupReminderAttributes, BackupReminderCreationAttributes> implements BackupReminderAttributes {
  public id!: string;
  public stationId!: string;
  public reminderDate!: Date;
  public isResolved!: boolean;
  public message!: string;
  public notifiedTo!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    BackupReminder.belongsTo(models.Station, {
      foreignKey: 'stationId',
      as: 'station'
    });
  }
}

export default (sequelize: Sequelize) => {
  BackupReminder.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stationId: DataTypes.UUID,
    reminderDate: DataTypes.DATE,
    isResolved: DataTypes.BOOLEAN,
    message: DataTypes.TEXT,
    notifiedTo: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BackupReminder',
  });
  return BackupReminder;
};
