import { DataTypes, Model, Sequelize, Association } from 'sequelize';

interface BackupAttributes {
  id?: string;
  stationId: string;
  status: 'pending' | 'completed' | 'failed';
  lastBackupDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BackupCreationAttributes extends Omit<BackupAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Backup extends Model<BackupAttributes, BackupCreationAttributes> implements BackupAttributes {
  public id!: string;
  public stationId!: string;
  public status!: 'pending' | 'completed' | 'failed';
  public lastBackupDate!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association mixins
  public station?: any;

  public static associations: {
    station: Association<Backup, any>;
  };

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    Backup.belongsTo(models.Station, {
      foreignKey: 'stationId',
      as: 'station'
    });
  }
}

export default (sequelize: Sequelize) => {
  Backup.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stationId: DataTypes.UUID,
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    lastBackupDate: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Backup',
  });
  return Backup;
};
