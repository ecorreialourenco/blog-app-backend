"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("friends", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      request_user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
      },
      target_user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
      },
      status: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      block: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,

      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      deleted_at: {
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("friends");
  },
};
