import { DataTypes, Model, Sequelize, Association } from 'sequelize';

interface StationAttributes {
  id?: string;
  stationName: string;
  serialNumber: string;
  location: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StationCreationAttributes extends Omit<StationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Station extends Model<StationAttributes, StationCreationAttributes> implements StationAttributes {
  public id!: string;
  public stationName!: string;
  public serialNumber!: string;
  public location!: string;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association mixins
  public creator?: any;
  public profile?: any;
  public backups?: any[];
  public backupReminders?: any[];

  public static associations: {
    creator: Association<Station, any>;
    profile: Association<Station, any>;
    backups: Association<Station, any>;
    backupReminders: Association<Station, any>;
  };

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    Station.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    Station.hasOne(models.Profile, {
      foreignKey: 'stationId',
      as: 'profile'
    });
    Station.hasMany(models.Backup, {
      foreignKey: 'stationId',
      as: 'backups'
    });
    Station.hasMany(models.BackupReminder, {
      foreignKey: 'stationId',
      as: 'backupReminders'
    });
  }
}

export default (sequelize: Sequelize) => {
  Station.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stationName: DataTypes.STRING,
    serialNumber: DataTypes.STRING,
    location: DataTypes.STRING,
    createdBy: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'Station',
  });
  return Station;
};
