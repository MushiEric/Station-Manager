'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add foreign key constraint from Stations to Users
    await queryInterface.addConstraint('Stations', {
      fields: ['createdBy'],
      type: 'foreign key',
      name: 'fk_stations_created_by',
      references: {
        table: 'Users',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraint
    await queryInterface.removeConstraint('Stations', 'fk_stations_created_by');
  }
};
