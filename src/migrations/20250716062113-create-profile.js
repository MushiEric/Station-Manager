'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Profiles', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      stationId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Stations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      phoneNumber: {
        type: Sequelize.STRING(15),
        allowNull: false
      },
      anydeskId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      anydeskPass: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      teamviewerId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      teamviewerPass: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      ptsPort: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true
      },
      ptsPassword: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      posUsername: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      posPassword: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      cloudflareLink: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Profiles');
  }
};