const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const QRCode = require('qrcode');

const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  member_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  membership_type: {
    type: DataTypes.ENUM('basic', 'premium', 'vip', 'lifetime'),
    allowNull: false,
    defaultValue: 'basic'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'expired'),
    allowNull: false,
    defaultValue: 'active'
  },
  join_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  zone_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'zones',
      key: 'id'
    }
  },
  profile_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'members',
  timestamps: true,
  hooks: {
    beforeCreate: async (member) => {
      // Generate QR code
      const qrData = JSON.stringify({
        memberId: member.member_id,
        name: `${member.first_name} ${member.last_name}`,
        type: member.membership_type
      });
      member.qr_code = await QRCode.toDataURL(qrData);
    },
    beforeUpdate: async (member) => {
      // Regenerate QR code if member data changes
      if (member.changed('member_id') || member.changed('first_name') || 
          member.changed('last_name') || member.changed('membership_type')) {
        const qrData = JSON.stringify({
          memberId: member.member_id,
          name: `${member.first_name} ${member.last_name}`,
          type: member.membership_type
        });
        member.qr_code = await QRCode.toDataURL(qrData);
      }
    }
  }
});

module.exports = Member; 