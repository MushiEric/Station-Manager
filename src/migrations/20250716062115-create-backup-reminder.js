'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BackupReminders', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      stationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Stations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reminderDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      isResolved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      notifiedTo: {
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
    await queryInterface.dropTable('BackupReminders');
  }
};