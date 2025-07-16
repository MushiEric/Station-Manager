import { DataTypes, Model, Sequelize, Association } from 'sequelize';

interface RoleAttributes {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

interface RoleCreationAttributes extends Omit<RoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: string;
  public name!: string;
  public status!: 'active' | 'inactive';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association mixins
  public users?: any[];

  public static associations: {
    users: Association<Role, any>;
  };

  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models: any) {
    Role.hasMany(models.User, {
      foreignKey: 'roleId',
      as: 'users'
    });
  }
}

export default (sequelize: Sequelize) => {
  Role.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'Role',
  });
  return Role;
};
