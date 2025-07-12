const Zone = require('./Zone');
const Member = require('./Member');
const Payment = require('./Payment');
const Event = require('./Event');
const EventAttendance = require('./EventAttendance');
const Notification = require('./Notification');

// Zone - Member relationship
Zone.hasMany(Member, { foreignKey: 'zone_id', as: 'members' });
Member.belongsTo(Zone, { foreignKey: 'zone_id', as: 'zone' });

// Member - Payment relationship
Member.hasMany(Payment, { foreignKey: 'member_id', as: 'payments' });
Payment.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });

// Member - EventAttendance relationship
Member.hasMany(EventAttendance, { foreignKey: 'member_id', as: 'eventAttendances' });
EventAttendance.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });

// Event - EventAttendance relationship
Event.hasMany(EventAttendance, { foreignKey: 'event_id', as: 'attendances' });
EventAttendance.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Member - Notification relationship
Member.hasMany(Notification, { foreignKey: 'member_id', as: 'notifications' });
Notification.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });

// Payment - EventAttendance relationship
Payment.hasOne(EventAttendance, { foreignKey: 'payment_id', as: 'eventAttendance' });
EventAttendance.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

module.exports = {
  Zone,
  Member,
  Payment,
  Event,
  EventAttendance,
  Notification
}; 