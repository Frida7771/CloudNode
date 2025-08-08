const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EmailLog = sequelize.define(
        "EmailLog",
        {
          id: {
            type: DataTypes.UUID,
            allowNull: true,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          email_sent_time: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            allowNull: false,
          },
          email_verified_time: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        {
          timestamps: false,
        }
      );

  return EmailLog;
};

