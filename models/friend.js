"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Friend extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Friend.belongsTo(models.User, { foreignKey: "requestUserId" });
      Friend.belongsTo(models.User, { foreignKey: "targetUserId" });
    }
  }
  Friend.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      requestUserId: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      targetUserId: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      status: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      block: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
      },
    },
    {
      sequelize,
      paranoid: true,
      underscored: true,
      modelName: "Friend",
    }
  );
  return Friend;
};
