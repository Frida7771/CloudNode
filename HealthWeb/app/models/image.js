const { DataTypes, Sequelize } = require('sequelize');
const User = require('./user'); // Import the User model

module.exports = (sequelize) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    upload_date: {
      type: DataTypes.DATEONLY, // Use DATEONLY to store only the date
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', // Name of the target table, assuming it's 'Users'
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'Reference to the associated user',
    },
  }, {
    tableName: 'Images', // Explicit table name
    timestamps: false,    // Disable createdAt and updatedAt
  });

  // Define associations outside the model definition function to avoid circular dependencies
  Image.associate = (models) => {
    Image.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Image;
};
