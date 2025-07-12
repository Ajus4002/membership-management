const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EventAttendance = sequelize.define('EventAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'members',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('registered', 'attended', 'no_show', 'cancelled'),
    allowNull: false,
    defaultValue: 'registered'
  },
  registration_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  attendance_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'event_attendances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['event_id', 'member_id']
    }
  ]
});

module.exports = EventAttendance; 