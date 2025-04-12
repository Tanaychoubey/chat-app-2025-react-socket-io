const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  recipient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('direct', 'system'),
    defaultValue: 'direct'
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'messages',
  underscored: true // This will use snake_case for column names
});

// Define associations
Message.associate = (models) => {
  Message.belongsTo(models.User, {
    as: 'sender',
    foreignKey: 'sender_id',
    onDelete: 'CASCADE'
  });
  Message.belongsTo(models.User, {
    as: 'recipient',
    foreignKey: 'recipient_id',
    onDelete: 'CASCADE'
  });
};

module.exports = Message; 