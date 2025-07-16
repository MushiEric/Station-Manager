'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create roles first
      const roles = [
        {
          id: uuidv4(),
          name: 'admin',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'manager',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await queryInterface.bulkInsert('Roles', roles, { transaction });

      // Get the created role IDs
      const adminRole = roles.find(role => role.name === 'admin');
      const managerRole = roles.find(role => role.name === 'manager');

      // Hash passwords
      const saltRounds = 12;
      const adminPassword = await bcrypt.hash('123456', saltRounds);
      const managerPassword = await bcrypt.hash('123456', saltRounds);

      // Create users
      const users = [
        {
          id: uuidv4(),
          firstName: 'Eric',
          lastName: 'mushi',
          username: 'eric.mushi',
          password: adminPassword,
          roleId: adminRole.id,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          firstName: 'hans',
          lastName: 'mushi',
          username: 'hans.mushi',
          password: managerPassword,
          roleId: managerRole.id,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await queryInterface.bulkInsert('Users', users, { transaction });

      await transaction.commit();
      console.log('✅ Successfully seeded initial roles and users');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error seeding initial data:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Delete users first (due to foreign key constraints)
      await queryInterface.bulkDelete('Users', {
        username: ['eric.mushi', 'hans.mushi']
      }, { transaction });

      // Delete roles
      await queryInterface.bulkDelete('Roles', {
        name: ['admin', 'manager']
      }, { transaction });

      await transaction.commit();
      console.log('✅ Successfully removed seeded data');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing seeded data:', error);
      throw error;
    }
  }
};
