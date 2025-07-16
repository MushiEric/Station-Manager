import { DataTypes, Model, Sequelize, Association } from 'sequelize';

interface ProfileAttributes {
  id?: string;
  stationId: string;
  phoneNumber: string;
  anydeskId: string;
  anydeskPass: string;
  teamviewerId: string;
  teamviewerPass: string;
  ptsPort: string;
  ptsPassword: string;
  posUsername: string;
  posPassword: string;
  cloudflareLink: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProfileCreationAttributes extends Omit<ProfileAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Profile extends Model<ProfileAttributes, ProfileCreationAttributes> implements ProfileAttributes {
  public id!: string;
  public stationId!: string;
  public phoneNumber!: string;
  public anydeskId!: string;
  public anydeskPass!: string;
  public teamviewerId!: string;
  public teamviewerPass!: string;
  public ptsPort!: string;
  public ptsPassword!: string;
  public posUsername!: string;
  public posPassword!: string;
  public cloudflareLink!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association mixins
  public station?: any;

  public static associations: {
    station: Association<Profile, any>;
  };

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    Profile.belongsTo(models.Station, {
      foreignKey: 'stationId',
      as: 'station'
    });
  }
}

export default (sequelize: Sequelize) => {
  Profile.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stationId: DataTypes.UUID,
    phoneNumber: DataTypes.STRING,
    anydeskId: DataTypes.STRING,
    anydeskPass: DataTypes.STRING,
    teamviewerId: DataTypes.STRING,
    teamviewerPass: DataTypes.STRING,
    ptsPort: DataTypes.STRING,
    ptsPassword: DataTypes.STRING,
    posUsername: DataTypes.STRING,
    posPassword: DataTypes.STRING,
    cloudflareLink: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Profile',
  });
  return Profile;
};
